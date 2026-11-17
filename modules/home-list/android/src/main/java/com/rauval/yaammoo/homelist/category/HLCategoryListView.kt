package com.rauval.yaammoo.homelist.category

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.rauval.yaammoo.homelist.HLColor
import com.rauval.yaammoo.homelist.HLDim
import com.rauval.yaammoo.homelist.HLFont
import com.rauval.yaammoo.homelist.HLImage
import com.rauval.yaammoo.homelist.px
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.lang.ref.WeakReference

/** Elements de la liste categorie. Identite d'une rangee = sa POSITION. */
sealed class HLCItem {
  object Banner : HLCItem()
  data class Row(val position: Int) : HLCItem()
  object Footer : HLCItem()
}

/**
 Liste native des tabs CATEGORIE du home (Android) : banniere, rangees de plats
 (grille), fantomes de la page suivante, pied de liste, dans UN `RecyclerView`.
 Pendant de `HLCategoryListView.swift`.

 SEPAREE de la liste « Tout » (`HomeListView`) : autre vue, autre etat, autres
 vues de rangee. Un souci ici ne touche jamais « Tout », et inversement.

 Revelation, a CHAQUE changement de tab (`feedKey`) :
 - banniere ET rangees repassent en squelette, liste remontee en haut ;
 - la porte s'ouvre quand la banniere et la PREMIERE rangee sont pretes, puis
   `HLCLayout.revealHoldMs` plus tard (pas de flash) ;
 - ensuite les rangees sortent DANS L'ORDRE, du haut vers le bas : une rangee
   prete attend celle du dessus (jamais le bas affiche et le haut en squelette).
 */
@SuppressLint("ViewConstructor")
class HLCategoryListView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), HLCategoryRowDelegate, HLCategoryBannerDelegate {

  val onMenuPress by EventDispatcher()
  val onBannerPress by EventDispatcher()
  val onEndReached by EventDispatcher()
  val onRefresh by EventDispatcher()

  /** Reserve commune des cartes de toutes les rangees. */
  private val cardPool = RecyclerView.RecycledViewPool()
  private val refresher = SwipeRefreshLayout(context)
  private val list = RecyclerView(context)
  private val lm = LinearLayoutManager(context)
  private val adapter = Adapter()

  // Props.
  var banners: List<HLCBanner> = emptyList()
  var prefetchDistance = 1200f
  var bottomInset = 0f
    set(value) {
      field = value
      list.setPadding(0, 0, 0, value.px())
    }
  var refreshing = false
    set(value) {
      field = value
      if (!value && refresher.isRefreshing) refresher.isRefreshing = false
    }

  // Donnees (`updateRows`).
  private var feedKey: String? = null
  /** Numero du tab affiche : tout rappel d'un tab precedent est ignore. */
  private var epoch = 0
  private var dishRows: List<HLCRow> = emptyList()
  private var hasMore = false
  private var ghostCount = 3
  private var footerText: String? = null
  private var footerIsEmpty = false
  /** VRAI par defaut : squelettes des le montage, avant la premiere page. */
  private var listLoading = true

  private var rows: List<HLCRowContent> = emptyList()
  private var shownBanners: List<HLCBanner> = emptyList()
  /** Nouveau tab : toutes les vues presentes sont reconfigurees. */
  private var forceReconfigure = false
  /** Haut de chaque element (px), plus la hauteur totale en dernier. */
  private var tops = IntArray(1)

  // Revelation (remise a zero a chaque tab).
  private var gateOpen = false
  private var gateScheduled = false
  private var bannerReady = false
  private val revealedIds = HashSet<String>()
  private val rowViews = HashMap<Int, WeakReference<HLCategoryRowView>>()
  private var bannerView: HLCategoryBannerView? = null

  private var fetchArmed = true
  private val mainHandler = Handler(Looper.getMainLooper())
  private var layoutRunnable: Runnable? = null
  private var layoutPosted = false

  init {
    HLDim.density = resources.displayMetrics.density
    HLFont.assets = context.assets
    HLImage.app = context.applicationContext
    setBackgroundColor(Color.WHITE)
    cardPool.setMaxRecycledViews(HLCategoryRowView.CARD_TYPE, 24)
    list.recycledViewPool.setMaxRecycledViews(TYPE_ROW, 8)
    list.layoutManager = lm
    list.adapter = adapter
    list.itemAnimator = null
    list.setHasFixedSize(true)
    list.clipToPadding = false
    list.setItemViewCacheSize(4)
    list.addOnScrollListener(object : RecyclerView.OnScrollListener() {
      override fun onScrolled(rv: RecyclerView, dx: Int, dy: Int) {
        checkEndReached()
        pump()
      }
    })
    refresher.setColorSchemeColors(HLColor.primary)
    refresher.setOnRefreshListener { onRefresh(emptyMap()) }
    refresher.addView(list, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT)
    addView(refresher, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT))
    layoutRunnable = Runnable {
      layoutPosted = false
      if (width > 0 && height > 0) {
        measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
        layout(left, top, right, bottom)
      }
    }
  }

  // Mise en page : React Native ne relaie pas les `requestLayout` des vues
  // natives (liste rechargee, rafraichissement) ; on se repose donc soi-meme.

  override fun requestLayout() {
    super.requestLayout()
    val r = layoutRunnable ?: return
    if (!layoutPosted) {
      layoutPosted = true
      postOnAnimation(r)
    }
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    val w = r - l
    val h = b - t
    refresher.measure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY))
    refresher.layout(0, 0, w, h)
  }

  // Configuration des vues (appelee par l'adaptateur)

  private fun bind(holder: RecyclerView.ViewHolder, item: HLCItem) {
    when (holder) {
      is BannerHolder -> {
        holder.banner.delegate = this
        bannerView = holder.banner
        holder.banner.configure(shownBanners, epoch, gateOpen)
      }
      is RowHolder -> {
        val pos = (item as? HLCItem.Row)?.position ?: return
        val row = holder.row
        row.delegate = this
        if (pos >= rows.size) return
        rowViews[pos] = WeakReference(row)
        val content = rows[pos]
        val already = gateOpen && content is HLCRowContent.Dishes && revealedIds.contains(content.row.id)
        row.configure(content, pos, already)
      }
      is FooterHolder -> {
        holder.itemView.layoutParams.height = HLCategoryFooterView.height(footerIsEmpty).px()
        holder.footer.configure(footerText ?: "", footerIsEmpty)
      }
    }
  }

  // Donnees

  /** `updateRows` : rangees deja decodees hors du fil de l'ecran, il reste a les poser. */
  fun updateRows(u: HLCUpdate) {
    if (u.feedKey != feedKey) resetFeed(u.feedKey)
    val total = maxOf(0, u.total)
    val next = ArrayList(dishRows.take(total))
    for ((i, row) in u.rows.withIndex()) {
      val pos = u.start + i
      // Jamais de trou : une rangee au-dela de la fin connue est ignoree.
      if (pos >= total || pos > next.size) break
      if (pos < next.size) next[pos] = row else next.add(row)
    }
    dishRows = next
    hasMore = u.hasMore
    ghostCount = maxOf(0, u.ghostCount)
    footerText = u.footerText
    footerIsEmpty = u.footerIsEmpty
    listLoading = u.loading
    apply()
  }

  /** Autre tab : on repart de zero, squelettes partout, haut de liste. */
  private fun resetFeed(key: String) {
    feedKey = key
    epoch++
    dishRows = emptyList()
    gateOpen = false
    gateScheduled = false
    bannerReady = false
    revealedIds.clear()
    rowViews.clear()
    fetchArmed = true
    forceReconfigure = true
    list.stopScroll()
    lm.scrollToPositionWithOffset(0, 0)
  }

  /** Appele a chaque lot de props (`OnViewDidUpdateProps`) et apres `updateRows`. */
  fun apply() {
    val next = ArrayList<HLCRowContent>(dishRows.size + ghostCount)
    dishRows.forEach { next.add(HLCRowContent.Dishes(it)) }
    // Fantomes : en queue quand une page suit, ou seuls pendant la premiere page.
    if ((hasMore && dishRows.isNotEmpty()) || (dishRows.isEmpty() && listLoading)) {
      repeat(ghostCount) { next.add(HLCRowContent.Ghost) }
    }
    val previous = rows
    val bannersChanged = banners != shownBanners
    if (next.size != previous.size) fetchArmed = true
    rows = next
    shownBanners = banners
    val force = forceReconfigure
    forceReconfigure = false

    val newItems = ArrayList<HLCItem>(next.size + 2)
    if (banners.isNotEmpty()) newItems.add(HLCItem.Banner)
    next.indices.forEach { newItems.add(HLCItem.Row(it)) }
    if (footerText != null) newItems.add(HLCItem.Footer)
    val oldItems = adapter.items

    val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
      override fun getOldListSize() = oldItems.size
      override fun getNewListSize() = newItems.size
      override fun areItemsTheSame(o: Int, n: Int) = oldItems[o] == newItems[n]
      override fun areContentsTheSame(o: Int, n: Int): Boolean = when (val item = newItems[n]) {
        HLCItem.Banner -> !bannersChanged && !force
        HLCItem.Footer -> false
        is HLCItem.Row -> !force && item.position < previous.size && previous[item.position] == next[item.position]
      }
    }, false)
    adapter.items = newItems
    recomputeTops()
    diff.dispatchUpdatesTo(adapter)
    tryOpenGate()
    post {
      checkEndReached()
      pump()
    }
  }

  private fun itemHeight(item: HLCItem): Int = when (item) {
    HLCItem.Banner -> HLCLayout.bannerHeight.px()
    HLCItem.Footer -> HLCategoryFooterView.height(footerIsEmpty).px()
    is HLCItem.Row -> HLCLayout.rowHeight.px()
  }

  private fun recomputeTops() {
    val items = adapter.items
    val t = IntArray(items.size + 1)
    for (i in items.indices) t[i + 1] = t[i] + itemHeight(items[i])
    tops = t
  }

  /** Rang de la premiere rangee dans la liste (apres la banniere). */
  private val rowOffset: Int get() = if (adapter.items.firstOrNull() == HLCItem.Banner) 1 else 0

  // Revelation

  /** Premiere rangee prete (ou liste vide) + banniere prete : porte ouverte apres l'attente. */
  private fun tryOpenGate() {
    if (gateOpen || gateScheduled) return
    val hasRows = dishRows.isNotEmpty()
    val first = rowViews[0]?.get()
    val firstReady = first != null && first.position == 0 && first.content is HLCRowContent.Dishes && first.ready
    val needsBanner = shownBanners.isNotEmpty()
    if (!((firstReady || (!hasRows && !listLoading)) && (bannerReady || !needsBanner))) return
    gateScheduled = true
    val e = epoch
    // Liste vide : rien a proteger d'un flash, le pied de liste sort tout de suite.
    val hold = if (hasRows) HLCLayout.revealHoldMs else 0L
    mainHandler.postDelayed({
      if (epoch == e) {
        gateScheduled = false
        gateOpen = true
        bannerView?.reveal(true)
        pump()
      }
    }, hold)
  }

  /**
   Revele les rangees pretes DANS L'ORDRE : du haut de l'ecran vers le bas, on
   s'arrete a la premiere qui n'est pas prete. Une rangee entierement au-dessus
   de l'ecran ne retient pas celles du dessous.
   */
  private fun pump() {
    if (!gateOpen) return
    val top = scrollY()
    for (pos in rowViews.keys.sorted()) {
      val row = rowViews[pos]?.get()
      if (row == null || row.position != pos || pos >= rows.size) {
        rowViews.remove(pos)
        continue
      }
      val index = pos + rowOffset
      if (index + 1 < tops.size && tops[index + 1] <= top) continue
      if (row.revealed) continue
      val c = row.content
      if (!row.ready || c !is HLCRowContent.Dishes) break
      revealedIds.add(c.row.id)
      row.reveal(true)
    }
  }

  // Defilement

  /** Position exacte du scroll (px), a partir des hauteurs connues. */
  private fun scrollY(): Int {
    val first = lm.findFirstVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION || first >= tops.size - 1) return 0
    val v = lm.findViewByPosition(first) ?: return 0
    return tops[first] - v.top
  }

  /** Page suivante demandee quand le PREMIER fantome approche (`prefetchDistance`). */
  private fun checkEndReached() {
    if (!hasMore || dishRows.isEmpty()) return
    val firstGhost = rows.indexOfFirst { it is HLCRowContent.Ghost }
    if (firstGhost < 0) return
    val index = firstGhost + rowOffset
    if (index >= tops.size) return
    val gap = tops[index] - (scrollY() + list.height)
    if (gap > (prefetchDistance + 200f).px()) fetchArmed = true
    if (gap <= prefetchDistance.px() && fetchArmed) {
      fetchArmed = false
      onEndReached(emptyMap())
    }
  }

  fun scrollToTop() {
    if (lm.findFirstVisibleItemPosition() > 6) list.scrollToPosition(6)
    list.post { list.smoothScrollToPosition(0) }
  }

  // HLCategoryRowDelegate

  override fun onDishTap(row: HLCategoryRowView, dishId: String, rowId: String) {
    onMenuPress(mapOf("rowId" to rowId, "dishId" to dishId))
  }

  override fun categoryRowIsReady(row: HLCategoryRowView) {
    if (gateOpen) pump() else tryOpenGate()
  }

  // HLCategoryBannerDelegate

  override fun categoryBannerTapped(bannerId: String) {
    onBannerPress(mapOf("id" to bannerId))
  }

  override fun categoryBannerIsReady(banner: HLCategoryBannerView, epoch: Int) {
    if (epoch != this.epoch) return
    bannerReady = true
    bannerView = banner
    if (gateOpen) banner.reveal(true) else tryOpenGate()
  }

  // Adaptateur : une vue de rangee (jamais re-typee), banniere et pied.

  class BannerHolder(val banner: HLCategoryBannerView) : RecyclerView.ViewHolder(banner)
  class RowHolder(val row: HLCategoryRowView) : RecyclerView.ViewHolder(row)
  class FooterHolder(val footer: HLCategoryFooterView) : RecyclerView.ViewHolder(footer)

  inner class Adapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
    var items: List<HLCItem> = emptyList()

    override fun getItemCount(): Int = items.size

    override fun getItemViewType(position: Int): Int = when (items[position]) {
      HLCItem.Banner -> TYPE_BANNER
      HLCItem.Footer -> TYPE_FOOTER
      is HLCItem.Row -> TYPE_ROW
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
      val ctx = parent.context
      val match = RecyclerView.LayoutParams.MATCH_PARENT
      return when (viewType) {
        TYPE_BANNER -> BannerHolder(HLCategoryBannerView(ctx).apply {
          layoutParams = RecyclerView.LayoutParams(match, HLCLayout.bannerHeight.px())
        })
        TYPE_FOOTER -> FooterHolder(HLCategoryFooterView(ctx).apply {
          layoutParams = RecyclerView.LayoutParams(match, HLCategoryFooterView.height(false).px())
        })
        else -> RowHolder(HLCategoryRowView(ctx, cardPool).apply {
          layoutParams = RecyclerView.LayoutParams(match, HLCLayout.rowHeight.px())
        })
      }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
      bind(holder, items[position])
    }

    override fun onViewRecycled(holder: RecyclerView.ViewHolder) {
      (holder as? RowHolder)?.row?.prepareForReuse()
    }
  }

  companion object {
    private const val TYPE_BANNER = 1
    private const val TYPE_FOOTER = 2
    private const val TYPE_ROW = 3
  }
}
