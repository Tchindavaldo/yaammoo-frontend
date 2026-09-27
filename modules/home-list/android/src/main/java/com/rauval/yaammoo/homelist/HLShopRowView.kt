package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.request.target.Target
import kotlin.math.ceil

interface HLShopRowDelegate {
  fun onMenuTap(row: HLShopRowView, menuId: String, shopId: String)
  /** Boutique deja revelee une fois : reaffichage direct, sans squelette. */
  fun isShopRevealed(shopId: String): Boolean
  /** La boutique est prete. Le delegue revele tout de suite, ou plus tard (banniere). */
  fun shopRowIsReady(row: HLShopRowView)
  /** Position de la liste de cartes (premiere carte, decalage px). */
  fun savedMenuOffset(shopId: String): Pair<Int, Int>?
  fun saveMenuOffset(shopId: String, position: Int, offsetPx: Int)
}

/**
 Rangee boutique (`Design7/4/5` + `ShopRevealProvider`, `HLShopCell.swift`) :
 en-tete, puis cartes menu dans une liste horizontale native.

 Revelation GROUPEE, comme `ShopRevealContext` : l'avatar et les images des
 cartes visibles sont attendus ensemble (8 s max), puis en-tete et cartes
 passent du squelette au contenu dans UNE animation. Si tout est deja en
 memoire (boutique revue, recyclage), aucun squelette : Glide repond alors
 pendant la demande meme.

 Les cartes de TOUTES les rangees partagent une reserve (`cardPool`, type =
 design) : une rangee recyclee reprend des cartes deja creees.
 */
class HLShopRowView(
  context: Context,
  val design: Int,
  cardPool: RecyclerView.RecycledViewPool,
) : HLBox(context) {
  var delegate: HLShopRowDelegate? = null
  val header = HLMerchantHeaderView(context)
  val menus = RecyclerView(context)
  private val lm = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false).apply {
    // Prechargement imbrique : la rangee a venir cree aussi ses premieres cartes.
    initialPrefetchItemCount = 4
  }
  private val cards = CardAdapter()
  private val cardSize = HLLayout.card(design)

  var content: HLRowContent? = null
    private set
  var position = 0
    private set
  var revealed = false
    private set
  /** Sonde : 0 = rangee neuve, jamais configuree / jamais affichee. */
  var configures = 0
    private set
  var displays = 0

  private var generation = 0
  private val pending = HashSet<String>()
  private val targets = ArrayList<Target<Drawable>>()
  private var timeout: Runnable? = null
  private var issuing = false

  private val shop: HLShop? get() = (content as? HLRowContent.Shop)?.shop

  init {
    created++
    setBackgroundColor(Color.WHITE)
    menus.layoutManager = lm
    menus.adapter = cards
    menus.setRecycledViewPool(cardPool)
    menus.setHasFixedSize(true)
    menus.itemAnimator = null
    menus.overScrollMode = View.OVER_SCROLL_NEVER
    menus.addItemDecoration(object : RecyclerView.ItemDecoration() {
      override fun getItemOffsets(outRect: Rect, view: View, parent: RecyclerView, state: RecyclerView.State) {
        val p = parent.getChildAdapterPosition(view)
        outRect.set(if (p > 0) HLLayout.cardGap.px() else 0, 0, 0, 0)
      }
    })
    addAll(header, menus)
    onPlace = { w, _ ->
      val pad = HLLayout.sidePadding
      header.frame(pad, HLLayout.rowTop, w - 2 * pad, HLLayout.headerHeight)
      val y = HLLayout.rowTop + HLLayout.headerHeight + HLLayout.headerGap
      menus.frame(pad, y, w - 2 * pad, cardSize.height + HLLayout.metaHeight)
    }
  }

  // Configuration

  fun configure(c: HLRowContent, pos: Int) {
    configures++
    generation++
    cancelLoads()
    content = c
    position = pos

    when (c) {
      is HLRowContent.Ghost -> {
        header.configure(null)
        applyRevealed(false)
        cards.notifyDataSetChanged()
        lm.scrollToPositionWithOffset(0, 0)
      }
      is HLRowContent.Shop -> {
        val s = c.shop
        header.configure(s)
        HLImage.set(header.avatar, s.avatar, HLMerchantHeaderView.AVATAR, HLMerchantHeaderView.AVATAR)
        val already = delegate?.isShopRevealed(s.id) ?: false
        // Images deja en memoire : Glide repond pendant la demande (`waitFor`
        // renvoie vrai), la boutique s'affiche directement, sans squelette.
        val ready = already || waitFor(revealUrls(s))
        applyRevealed(ready)
        cards.notifyDataSetChanged()
        val saved = delegate?.savedMenuOffset(s.id)
        lm.scrollToPositionWithOffset(saved?.first ?: 0, saved?.second ?: 0)
        if (ready) {
          cancelLoads()
          delegate?.shopRowIsReady(this)
        }
      }
    }
  }

  /** Images attendues : avatar + cartes visibles a l'ouverture de la rangee. */
  private fun revealUrls(s: HLShop): List<Triple<String, Float, Float>> {
    val out = ArrayList<Triple<String, Float, Float>>()
    s.avatar?.takeIf { it.isNotEmpty() }?.let {
      out.add(Triple(it, HLMerchantHeaderView.AVATAR, HLMerchantHeaderView.AVATAR))
    }
    val screenW = maxOf(width, resources.displayMetrics.widthPixels).dp()
    val visible = ceil((screenW - 2 * HLLayout.sidePadding) / (cardSize.width + HLLayout.cardGap)).toInt()
    for (m in s.menus.take(visible)) {
      m.image?.takeIf { it.isNotEmpty() }?.let { out.add(Triple(it, cardSize.width, cardSize.height)) }
    }
    return out
  }

  /** Vrai si tout est deja la (reponses pendant la demande) ; sinon attend. */
  private fun waitFor(urls: List<Triple<String, Float, Float>>): Boolean {
    val gen = generation
    pending.clear()
    urls.forEach { pending.add(it.first) }
    if (pending.isEmpty()) return true
    issuing = true
    for ((u, w, h) in urls) {
      val t = HLImage.fetch(u, w, h) {
        if (generation == gen) {
          pending.remove(u)
          if (pending.isEmpty() && !issuing) becameReady()
        }
      }
      if (t != null) targets.add(t)
    }
    issuing = false
    if (pending.isEmpty()) return true
    val work = Runnable { if (generation == gen) becameReady() }
    timeout = work
    mainHandler.postDelayed(work, HLLayout.revealMaxWaitMs)
    return false
  }

  private fun becameReady() {
    timeout?.let { mainHandler.removeCallbacks(it) }
    timeout = null
    pending.clear()
    delegate?.shopRowIsReady(this)
  }

  private fun cancelLoads() {
    targets.forEach { HLImage.cancel(it) }
    targets.clear()
    timeout?.let { mainHandler.removeCallbacks(it) }
    timeout = null
    pending.clear()
  }

  // Revelation

  /** Appele par le delegue quand le groupe doit sortir (fondu 220 ms). */
  fun reveal(animated: Boolean) {
    if (shop == null || revealed) return
    revealed = true
    val gen = generation
    val pairs = ArrayList<Pair<View, View>>()
    pairs.add(header.content to header.skeleton)
    val visibleCards = ArrayList<HLMenuCardView>()
    for (i in 0 until menus.childCount) {
      (menus.getChildAt(i) as? HLMenuCardView)?.let {
        visibleCards.add(it)
        pairs.add(it.content to it.skeletons)
      }
    }
    val done = Runnable {
      if (!revealed || generation != gen) return@Runnable
      header.setSkeletonBreathing(false)
      visibleCards.forEach { it.setBreathing(false) }
    }
    if (!animated) {
      pairs.forEach { (c, s) ->
        c.alpha = 1f
        s.alpha = 0f
      }
      done.run()
      return
    }
    val ease = DecelerateInterpolator()
    pairs.forEach { (c, s) ->
      c.animate().alpha(1f).setDuration(HLLayout.revealMs).setInterpolator(ease)
      s.animate().alpha(0f).setDuration(HLLayout.revealMs).setInterpolator(ease)
    }
    mainHandler.postDelayed(done, HLLayout.revealMs)
  }

  private fun applyRevealed(r: Boolean) {
    revealed = r
    header.content.animate().cancel()
    header.skeleton.animate().cancel()
    header.content.alpha = if (r) 1f else 0f
    header.skeleton.alpha = if (r) 0f else 1f
    header.setSkeletonBreathing(!r)
  }

  // Cycle de vie

  /** Rangee rendue a la reserve : position des cartes gardee, chargements coupes. */
  fun prepareForReuse() {
    shop?.let { s ->
      val first = lm.findFirstVisibleItemPosition()
      val v = if (first != RecyclerView.NO_POSITION) lm.findViewByPosition(first) else null
      if (v != null) delegate?.saveMenuOffset(s.id, first, lm.getDecoratedLeft(v))
    }
    generation++
    cancelLoads()
  }

  private fun tap(index: Int) {
    val s = shop ?: return
    if (index < 0 || index >= s.menus.size) return
    delegate?.onMenuTap(this, s.menus[index].id, s.id)
  }

  // Cartes (liste horizontale)

  class CardHolder(val card: HLMenuCardView) : RecyclerView.ViewHolder(card)

  inner class CardAdapter : RecyclerView.Adapter<CardHolder>() {
    override fun getItemCount(): Int = when (val c = content) {
      is HLRowContent.Ghost -> HL_GHOST_MENU_COUNT
      is HLRowContent.Shop -> c.shop.menus.size
      null -> 0
    }

    override fun getItemViewType(position: Int): Int = design

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CardHolder {
      val card = HLMenuCardView(parent.context, viewType)
      val s = HLLayout.card(viewType)
      card.layoutParams = RecyclerView.LayoutParams(s.width.px(), (s.height + HLLayout.metaHeight).px())
      val holder = CardHolder(card)
      // Reserve commune : la carte peut servir a une autre rangee plus tard.
      // L'appui vise donc la rangee qui l'affiche AU MOMENT de l'appui.
      card.setOnClickListener {
        (holder.bindingAdapter as? CardAdapter)?.tapAt(holder.bindingAdapterPosition)
      }
      return holder
    }

    override fun onBindViewHolder(holder: CardHolder, position: Int) {
      val s = shop
      val menu = s?.menus?.getOrNull(position)
      holder.card.configure(menu, s?.deliveryTime ?: "", revealed)
      holder.card.isClickable = menu != null
    }

    fun tapAt(index: Int) = tap(index)
  }

  companion object {
    /** Sonde : rangees creees depuis le lancement. */
    var created = 0
    // ⚠️ Pas `handler` : ce nom designe deja `View.getHandler()` (nul hors ecran).
    private val mainHandler = Handler(Looper.getMainLooper())
  }
}
