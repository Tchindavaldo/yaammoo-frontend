package com.rauval.yaammoo.homelist

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.LinearLayout
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 Liste native du home (Android) : banniere, rangees boutiques, fantomes de la
 page suivante, pied de liste, dans UN `RecyclerView`. Pendant de
 `HomeListView.swift` : JS ne fait que fournir les donnees et recevoir les
 evenements ; defilement, recyclage, images, squelettes et fondus vivent
 entierement cote natif, sans aller-retour JS pendant le scroll.

 Reserves : une par design de rangee (liste) et UNE commune a toutes les
 cartes (`cardPool`, type = design). Hauteurs fixes par design.
 */
@SuppressLint("ViewConstructor")
class HomeListView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), HLShopRowDelegate, HLBannerDelegate {

  val onMenuPress by EventDispatcher()
  val onBannerPress by EventDispatcher()
  val onEndReached by EventDispatcher()
  val onRefresh by EventDispatcher()
  val onEdgeChange by EventDispatcher()
  /** Rapports de fluidite (scroll, pages, prechauffage) : journal `[HL]`, cote JS. */
  val onDiagnostics by EventDispatcher()
  /** Statistiques : boutiques visibles a >= 50 %, envoyees quand l'ensemble change. */
  val onVisibleShops by EventDispatcher()
  private var visibleShopIds: List<String> = emptyList()

  private val perf = HLPerfMonitor()
  /** Rangees creees au repos avant le premier scroll (prop `preheatScreens`). */
  val preheater = HLPreheater(this)
  /** Reserve commune des cartes de toutes les rangees (type = design). */
  val cardPool = RecyclerView.RecycledViewPool()

  private val refresher = SwipeRefreshLayout(context)
  internal val list = RecyclerView(context)
  private val lm = LinearLayoutManager(context)
  internal val adapter = HLListAdapter(this)

  // Boutiques et etat de fin de liste : `updateRows`. Le reste : props,
  // appliquees ensemble dans `applyProps`.
  var shops: List<HLShop> = emptyList()
  var banners: List<HLBanner> = emptyList()
  var bannerLoading = false
  var hasMore = false
  var ghostCount = 3
  var footerText: String? = null
  var footerIsEmpty = false
  /** Premiere page en cours. VRAI par defaut : la banniere ne sort pas seule. */
  var listLoading = true
  /** Le fetch part quand le premier fantome est a moins de cette distance (dp). */
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

  internal var rows: List<HLRowContent> = emptyList()
    private set
  private var shownBanners: List<HLBanner> = emptyList()
  private var shownBannerLoading = false
  private val revealedShops = HashSet<String>()
  private val menuOffsets = HashMap<String, Pair<Int, Int>>()
  private val prefetched = HashSet<String>()
  /** Haut de chaque element (px), plus la hauteur totale en dernier. */
  internal var tops = IntArray(1)
    private set
  private var lastPatch: Pair<Int, Double>? = null

  private var fetchArmed = true
  private var atTop = true
  private var nearBottom = false
  private var dragging = false

  // Revelation commune banniere + premiere boutique (une seule fois).
  private var firstGateOpen = false
  private var bannerReady = false
  private var firstShopReady = false
  private var bannerView: HLBannerView? = null
  private var firstShopRow: HLShopRowView? = null

  private var layoutRunnable: Runnable? = null
  private var layoutPosted = false

  init {
    HLDim.density = resources.displayMetrics.density
    HLFont.assets = context.assets
    HLImage.app = context.applicationContext
    HLPerfMonitor.detect(context.applicationContext)
    setBackgroundColor(Color.WHITE)
    for (d in HLLayout.designCycle) {
      cardPool.setMaxRecycledViews(d, 24)
      list.recycledViewPool.setMaxRecycledViews(HLListAdapter.rowType(d), 8)
    }
    list.layoutManager = lm
    list.adapter = adapter
    list.itemAnimator = null
    list.setHasFixedSize(true)
    list.clipToPadding = false
    list.setItemViewCacheSize(4)
    list.addOnScrollListener(object : RecyclerView.OnScrollListener() {
      override fun onScrolled(rv: RecyclerView, dx: Int, dy: Int) = onListScrolled()
      override fun onScrollStateChanged(rv: RecyclerView, newState: Int) = onScrollState(newState)
    })
    list.addOnChildAttachStateChangeListener(object : RecyclerView.OnChildAttachStateChangeListener {
      // Sonde : entree a l'ecran d'une rangee (`in<rang>d<design>`, `n` = premier
      // affichage de cette vue) et sortie (`out<rang>`).
      override fun onChildViewAttachedToWindow(view: View) {
        val row = view as? HLShopRowView ?: return
        perf.mark { "in${row.position}d${row.design}${if (row.displays == 0) "n" else ""}" }
        row.displays++
      }

      override fun onChildViewDetachedFromWindow(view: View) {
        val row = view as? HLShopRowView ?: return
        perf.mark { "out${row.position}" }
      }
    })
    refresher.setColorSchemeColors(HLColor.primary)
    refresher.setOnRefreshListener { onRefresh(emptyMap()) }
    refresher.addView(list, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT)
    addView(refresher, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT))

    perf.offsetProvider = { scrollY().dp() }
    perf.refreshRateProvider = { display?.refreshRate ?: 60f }
    perf.onReport = { r ->
      // Rendu des barres floutees, cellules creees, hauteur visible.
      r["blur"] = HLBlurBar.MODE
      r["bakes"] = HLBlurTransformation.bakes.get()
      r["bakeMaxMs"] = HLBlurTransformation.bakeMaxMs
      r["bannerAutoplay"] = HLBannerView.autoplayEnabled
      r["rowCells"] = HLShopRowView.created
      r["cardCells"] = HLMenuCardView.created
      r["viewH"] = height.dp().toInt()
      report(r)
    }
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

  /** Rapport de la sonde vers JS (journal `[HL]`), builds de test seulement. */
  fun report(r: MutableMap<String, Any>) {
    if (!HLPerfMonitor.enabled) return
    onDiagnostics(r)
  }

  fun markEvent(what: String) = perf.mark { what }

  // Configuration des vues (appelee par l'adaptateur)

  fun bind(holder: RecyclerView.ViewHolder, item: HLItem) {
    when (holder) {
      is HLListAdapter.BannerHolder -> {
        holder.banner.delegate = this
        bannerView = holder.banner
        holder.banner.configure(shownBanners, shownBannerLoading)
      }
      is HLListAdapter.RowHolder -> {
        val pos = (item as? HLItem.Row)?.position ?: return
        val row = holder.row
        row.delegate = this
        val fresh = row.configures == 0
        val t0 = System.nanoTime()
        if (pos < rows.size) row.configure(rows[pos], pos)
        perf.recordConfigure(System.nanoTime() - t0)
        // `n` : vue neuve (sinon une vue reutilisee), `/ms` : cout.
        perf.mark { "cfg$pos${if (fresh) "n" else ""}/${HLPerfMonitor.ms(t0)}" }
      }
      is HLListAdapter.FooterHolder -> {
        holder.itemView.layoutParams.height = HLFooterView.height(footerIsEmpty).px()
        holder.footer.configure(footerText ?: "", footerIsEmpty)
      }
    }
  }

  // Mise a jour des boutiques

  /** `updateRows` : rangees deja decodees hors du fil de l'ecran, il reste a les poser. */
  fun updateRows(u: HLRowsUpdate) {
    val t0 = System.nanoTime()
    val total = maxOf(0, u.total)
    val next = ArrayList(shops.take(total))
    for ((i, shop) in u.rows.withIndex()) {
      val pos = u.start + i
      // Jamais de trou : une rangee au-dela de la fin connue est ignoree.
      if (pos >= total || pos > next.size) break
      if (pos < next.size) next[pos] = shop else next.add(shop)
    }
    shops = next
    hasMore = u.hasMore
    ghostCount = maxOf(0, u.ghostCount)
    footerText = u.footerText
    footerIsEmpty = u.footerIsEmpty
    listLoading = u.loading
    lastPatch = u.rows.size to (System.nanoTime() - t0) / 1e6
    applyProps()
  }

  /** Appele a chaque lot de props (`OnViewDidUpdateProps`) et apres `updateRows`. */
  fun applyProps() {
    val next = ArrayList<HLRowContent>(shops.size + ghostCount)
    shops.forEach { next.add(HLRowContent.Shop(it)) }
    // Fantomes : en queue quand une page suit, ou seuls pendant la premiere page.
    if ((hasMore && shops.isNotEmpty()) || (shops.isEmpty() && listLoading)) {
      for (pos in shops.size until shops.size + ghostCount) next.add(HLRowContent.Ghost(HLLayout.design(pos)))
    }
    val previous = rows
    val bannersChanged = banners != shownBanners || bannerLoading != shownBannerLoading
    // Une page arrivee : on re-arme le fetch (voir `checkEndReached`).
    if (next.size != previous.size) fetchArmed = true
    rows = next
    shownBanners = banners
    shownBannerLoading = bannerLoading

    val newItems = ArrayList<HLItem>(next.size + 2)
    if (banners.isNotEmpty() || bannerLoading) newItems.add(HLItem.Banner)
    next.forEachIndexed { i, c -> newItems.add(HLItem.Row(i, c.design)) }
    if (footerText != null) newItems.add(HLItem.Footer)
    val oldItems = adapter.items

    // Reconfigurer SEULEMENT ce qui a change (fantome rempli, boutique mise a
    // jour, heure de livraison...), a identite egale (position + design).
    var reconfigured = 0
    val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
      override fun getOldListSize() = oldItems.size
      override fun getNewListSize() = newItems.size
      override fun areItemsTheSame(o: Int, n: Int) = oldItems[o] == newItems[n]
      override fun areContentsTheSame(o: Int, n: Int): Boolean {
        val same = when (val item = newItems[n]) {
          HLItem.Banner -> !bannersChanged
          HLItem.Footer -> false
          is HLItem.Row -> item.position < previous.size && previous[item.position] == next[item.position]
        }
        if (!same && newItems[n] is HLItem.Row) reconfigured++
        return same
      }
    }, false)
    adapter.items = newItems
    recomputeTops()

    val t0 = System.nanoTime()
    perf.mark { "apply${next.size}" }
    diff.dispatchUpdatesTo(adapter)
    // Sonde : cout d'une arrivee de page, pendant ou hors geste.
    if (next.size != previous.size || reconfigured > 0) {
      val r = mutableMapOf<String, Any>(
        "kind" to "apply",
        "applyMs" to (System.nanoTime() - t0) / 100_000 / 10.0,
        "rowsBefore" to previous.size,
        "rowsAfter" to next.size,
        "reconfigured" to reconfigured,
        "duringScroll" to perf.isRunning,
      )
      lastPatch?.let {
        r["patchRows"] = it.first
        r["patchMs"] = Math.round(it.second * 10) / 10.0
      }
      report(r)
    }
    lastPatch = null
    // Fin du chargement sans boutique : la banniere attendait peut-etre la liste.
    tryOpenFirstGate()
    post {
      checkEndReached()
      // Fantomes remplis sur place, sans scroll : de nouvelles boutiques a l'ecran.
      checkVisibleShops()
    }
  }

  private fun itemHeight(item: HLItem): Int = when (item) {
    HLItem.Banner -> HLLayout.bannerHeight.px()
    HLItem.Footer -> HLFooterView.height(footerIsEmpty).px()
    is HLItem.Row -> HLLayout.rowHeight(item.design).px()
  }

  private fun recomputeTops() {
    val items = adapter.items
    val t = IntArray(items.size + 1)
    for (i in items.indices) t[i + 1] = t[i] + itemHeight(items[i])
    tops = t
  }

  /** Rang de la premiere rangee dans la liste (apres la banniere). */
  internal val rowOffset: Int get() = if (adapter.items.firstOrNull() == HLItem.Banner) 1 else 0

  // Defilement

  /** Position exacte du scroll (px), a partir des hauteurs connues. */
  fun scrollY(): Int {
    val first = lm.findFirstVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION || first >= tops.size - 1) return 0
    val v = lm.findViewByPosition(first) ?: return 0
    return tops[first] - v.top
  }

  private fun onListScrolled() {
    val y = scrollY()
    val distanceToEnd = tops.last() + list.paddingBottom - list.height - y
    val top = y <= 4.px()
    // `LOADER_VISIBLE_DISTANCE` du home : le loader JS n'apparait qu'en bas.
    val near = distanceToEnd <= 120.px()
    if (top != atTop || near != nearBottom) {
      atTop = top
      nearBottom = near
      perf.mark { if (top) "top" else "leftTop" }
      onEdgeChange(mapOf("atTop" to top, "nearBottom" to near))
    }
    checkEndReached()
    prefetchAhead()
    checkVisibleShops()
  }

  /**
   Boutiques visibles a 50 % au moins dans la hauteur VISIBLE de la vue (pas
   celle de la liste allongee par le prechauffage). Seules les positions
   affichees sont parcourues ; l'evenement ne part que si l'ensemble change.
   */
  private fun checkVisibleShops() {
    val first = lm.findFirstVisibleItemPosition()
    val last = lm.findLastVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION || last == RecyclerView.NO_POSITION) return
    val top = scrollY()
    val bottom = top + height
    val ids = ArrayList<String>()
    val positions = ArrayList<Int>()
    for (index in first..last) {
      val pos = index - rowOffset
      if (pos < 0 || pos >= rows.size || index + 1 >= tops.size) continue
      val shop = (rows[pos] as? HLRowContent.Shop)?.shop ?: continue
      val h = tops[index + 1] - tops[index]
      if (h <= 0) continue
      val shown = minOf(tops[index + 1], bottom) - maxOf(tops[index], top)
      if (shown * 2 >= h) {
        ids.add(shop.id)
        positions.add(pos)
      }
    }
    if (ids == visibleShopIds) return
    visibleShopIds = ids
    onVisibleShops(mapOf("ids" to ids, "positions" to positions))
  }

  // Sonde : un rapport par geste (doigt pose -> fin de l'elan).
  private fun onScrollState(state: Int) {
    when (state) {
      RecyclerView.SCROLL_STATE_DRAGGING -> {
        dragging = true
        preheater.stop("drag")
        perf.begin()
      }
      RecyclerView.SCROLL_STATE_SETTLING -> {
        if (dragging) perf.fingerUp()
        dragging = false
      }
      RecyclerView.SCROLL_STATE_IDLE -> {
        dragging = false
        perf.end(rows.size)
      }
    }
  }

  /**
   Page suivante demandee quand le PREMIER fantome approche (`prefetchDistance`),
   bien avant qu'il soit a l'ecran. Une demande par approche : re-armee a
   l'arrivee d'une page ou quand on s'eloigne.
   */
  private fun checkEndReached() {
    // Squelettes de la premiere page : elle est deja demandee par le home.
    if (!hasMore || shops.isEmpty()) return
    val firstGhost = rows.indexOfFirst { it is HLRowContent.Ghost }
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

  /** Images des 3 rangees sous la derniere visible, chargees d'avance. */
  private fun prefetchAhead() {
    val last = lm.findLastVisibleItemPosition()
    if (last == RecyclerView.NO_POSITION) return
    val t0 = System.nanoTime()
    val items = ArrayList<Triple<String?, Float, Float>>()
    for (i in last + 1..last + 3) {
      val row = adapter.items.getOrNull(i) as? HLItem.Row ?: continue
      val s = (rows.getOrNull(row.position) as? HLRowContent.Shop)?.shop ?: continue
      if (!prefetched.add(s.id)) continue
      val size = HLLayout.card(s.design)
      items.add(Triple(s.avatar, HLMerchantHeaderView.AVATAR, HLMerchantHeaderView.AVATAR))
      s.menus.take(3).forEach { items.add(Triple(it.image, size.width, size.height)) }
    }
    if (items.isEmpty()) return
    HLImage.prefetch(items)
    perf.mark { "pf${items.size}/${HLPerfMonitor.ms(t0)}" }
  }

  fun scrollToTop() {
    if (lm.findFirstVisibleItemPosition() > 6) list.scrollToPosition(6)
    list.post { list.smoothScrollToPosition(0) }
  }

  // HLShopRowDelegate

  override fun onMenuTap(row: HLShopRowView, menuId: String, shopId: String) {
    onMenuPress(mapOf("shopId" to shopId, "menuId" to menuId))
  }

  override fun isShopRevealed(shopId: String): Boolean = revealedShops.contains(shopId)

  override fun shopRowIsReady(row: HLShopRowView) {
    if (row.position == 0 && !firstGateOpen) {
      firstShopReady = true
      firstShopRow = row
      tryOpenFirstGate()
      return
    }
    revealShop(row)
  }

  private fun revealShop(row: HLShopRowView) {
    (row.content as? HLRowContent.Shop)?.let { revealedShops.add(it.shop.id) }
    if (!row.revealed) perf.mark { "reveal${row.position}" }
    row.reveal(true)
  }

  override fun savedMenuOffset(shopId: String): Pair<Int, Int>? = menuOffsets[shopId]

  override fun saveMenuOffset(shopId: String, position: Int, offsetPx: Int) {
    menuOffsets[shopId] = position to offsetPx
  }

  // HLBannerDelegate

  override fun bannerTapped(bannerId: String) {
    onBannerPress(mapOf("id" to bannerId))
  }

  override fun bannerAutoplay(banner: HLBannerView) = perf.mark { "banner" }

  override fun bannerIsReady(banner: HLBannerView) {
    bannerReady = true
    bannerView = banner
    if (firstGateOpen) banner.reveal(true) else tryOpenFirstGate()
  }

  /**
   La banniere sort AVEC la premiere boutique, dans la meme animation. Sans
   boutique, elle sort seule.
   */
  private fun tryOpenFirstGate() {
    if (firstGateOpen) return
    val hasShop = rows.any { it is HLRowContent.Shop }
    val needsBanner = shownBanners.isNotEmpty()
    // Sans boutique ET sans chargement seulement : sinon la banniere sortirait
    // avant que la premiere boutique (et ses images) soit arrivee.
    if (!((firstShopReady || (!hasShop && !listLoading)) && (bannerReady || !needsBanner))) return
    firstGateOpen = true
    firstShopRow?.takeIf { it.position == 0 }?.let { revealShop(it) }
    bannerView?.reveal(true)
    // Rangees sous l'ecran creees au repos, une fois le fondu termine.
    preheater.schedule(HLLayout.revealMs + 100)
  }
}
