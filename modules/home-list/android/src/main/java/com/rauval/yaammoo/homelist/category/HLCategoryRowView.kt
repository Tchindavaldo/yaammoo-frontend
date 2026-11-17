package com.rauval.yaammoo.homelist.category

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
import com.rauval.yaammoo.homelist.HLBox
import com.rauval.yaammoo.homelist.HLImage
import com.rauval.yaammoo.homelist.addAll
import com.rauval.yaammoo.homelist.dp
import com.rauval.yaammoo.homelist.frame
import com.rauval.yaammoo.homelist.px
import kotlin.math.ceil

interface HLCategoryRowDelegate {
  fun onDishTap(row: HLCategoryRowView, dishId: String, rowId: String)
  /** Images de la rangee pretes (ou deja en memoire). La liste decide QUAND reveler. */
  fun categoryRowIsReady(row: HLCategoryRowView)
}

/**
 Rangee de la liste categorie : N cartes plat en liste horizontale, sans
 en-tete boutique. Copie dediee (R16) de `HLShopRowView`, pendant de
 `HLCategoryRowCell.swift`.

 La rangee ne se revele JAMAIS seule : elle signale `ready` (images des cartes
 visibles chargees, 8 s max) et la liste la revele dans l'ordre, du haut vers
 le bas (`HLCategoryListView.pump`).
 */
class HLCategoryRowView(context: Context, cardPool: RecyclerView.RecycledViewPool) : HLBox(context) {
  var delegate: HLCategoryRowDelegate? = null
  private val cards = RecyclerView(context)
  private val lm = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false).apply {
    initialPrefetchItemCount = 4
  }
  private val adapter = CardAdapter()

  var content: HLCRowContent = HLCRowContent.Ghost
    private set
  var position = -1
    private set
  /** Images pretes : la rangee PEUT sortir (la liste choisit le moment). */
  var ready = false
    private set
  var revealed = false
    private set

  private var generation = 0
  private val pending = HashSet<String>()
  private val targets = ArrayList<Target<Drawable>>()
  private var timeout: Runnable? = null
  private var issuing = false

  private val row: HLCRow? get() = (content as? HLCRowContent.Dishes)?.row

  init {
    setBackgroundColor(Color.WHITE)
    cards.layoutManager = lm
    cards.adapter = adapter
    cards.setRecycledViewPool(cardPool)
    cards.setHasFixedSize(true)
    cards.itemAnimator = null
    cards.overScrollMode = View.OVER_SCROLL_NEVER
    cards.addItemDecoration(object : RecyclerView.ItemDecoration() {
      override fun getItemOffsets(outRect: Rect, view: View, parent: RecyclerView, state: RecyclerView.State) {
        val p = parent.getChildAdapterPosition(view)
        outRect.set(if (p > 0) HLCLayout.cardGap.px() else 0, 0, 0, 0)
      }
    })
    addAll(cards)
    onPlace = { w, _ ->
      val pad = HLCLayout.sidePadding
      cards.frame(pad, HLCLayout.rowTop, w - 2 * pad, HLCLayout.card.height + HLCLayout.metaHeight)
    }
  }

  // Configuration

  /**
   `alreadyRevealed` : rangee deja sortie depuis le dernier changement de tab
   (retour par le scroll) : reaffichage direct, sans squelette.
   */
  fun configure(c: HLCRowContent, pos: Int, alreadyRevealed: Boolean) {
    generation++
    cancelLoads()
    content = c
    position = pos
    when (c) {
      is HLCRowContent.Ghost -> {
        ready = false
        revealed = false
      }
      is HLCRowContent.Dishes -> {
        revealed = alreadyRevealed
        // Images deja en memoire : Glide repond pendant la demande.
        ready = alreadyRevealed || waitFor(revealUrls(c.row))
        if (ready) cancelLoads()
      }
    }
    adapter.notifyDataSetChanged()
    lm.scrollToPositionWithOffset(0, 0)
    if (ready) delegate?.categoryRowIsReady(this)
  }

  /** Images attendues : cartes visibles a l'ouverture de la rangee. */
  private fun revealUrls(r: HLCRow): List<String> {
    val screenW = maxOf(width, resources.displayMetrics.widthPixels).dp()
    val visible = ceil((screenW - 2 * HLCLayout.sidePadding) / (HLCLayout.card.width + HLCLayout.cardGap)).toInt()
    return r.dishes.take(visible).mapNotNull { d -> d.image?.takeIf { it.isNotEmpty() } }
  }

  /** Vrai si tout est deja la (reponses pendant la demande) ; sinon attend. */
  private fun waitFor(urls: List<String>): Boolean {
    val gen = generation
    pending.clear()
    pending.addAll(urls)
    if (pending.isEmpty()) return true
    issuing = true
    for (u in urls) {
      val t = HLImage.fetch(u, HLCLayout.card.width, HLCLayout.card.height) {
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
    mainHandler.postDelayed(work, HLCLayout.revealMaxWaitMs)
    return false
  }

  private fun becameReady() {
    if (ready) return
    timeout?.let { mainHandler.removeCallbacks(it) }
    timeout = null
    pending.clear()
    ready = true
    delegate?.categoryRowIsReady(this)
  }

  private fun cancelLoads() {
    targets.forEach { HLImage.cancel(it) }
    targets.clear()
    timeout?.let { mainHandler.removeCallbacks(it) }
    timeout = null
    pending.clear()
  }

  // Revelation

  /** Appele par la liste, dans l'ordre des rangees (fondu 220 ms). */
  fun reveal(animated: Boolean) {
    if (row == null || !ready || revealed) return
    revealed = true
    val gen = generation
    val visible = ArrayList<HLCategoryCardView>()
    for (i in 0 until cards.childCount) (cards.getChildAt(i) as? HLCategoryCardView)?.let { visible.add(it) }
    if (!animated) {
      visible.forEach { it.setRevealed(true) }
      return
    }
    val ease = DecelerateInterpolator()
    visible.forEach {
      it.content.animate().alpha(1f).setStartDelay(0).setDuration(HLCLayout.revealMs).setInterpolator(ease)
      it.skeletons.animate().alpha(0f).setStartDelay(0).setDuration(HLCLayout.revealMs).setInterpolator(ease)
    }
    mainHandler.postDelayed({
      if (revealed && generation == gen) visible.forEach { it.setBreathing(false) }
    }, HLCLayout.revealMs)
  }

  // Cycle de vie

  /** Rangee rendue a la reserve : chargements coupes. */
  fun prepareForReuse() {
    generation++
    cancelLoads()
  }

  private fun tap(index: Int) {
    val r = row ?: return
    if (index < 0 || index >= r.dishes.size) return
    delegate?.onDishTap(this, r.dishes[index].id, r.id)
  }

  // Cartes (liste horizontale)

  class CardHolder(val card: HLCategoryCardView) : RecyclerView.ViewHolder(card)

  inner class CardAdapter : RecyclerView.Adapter<CardHolder>() {
    override fun getItemCount(): Int = when (val c = content) {
      is HLCRowContent.Ghost -> HLCLayout.ghostCards
      is HLCRowContent.Dishes -> c.row.dishes.size
    }

    override fun getItemViewType(position: Int): Int = CARD_TYPE

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CardHolder {
      val card = HLCategoryCardView(parent.context)
      card.layoutParams = RecyclerView.LayoutParams(
        HLCLayout.card.width.px(), (HLCLayout.card.height + HLCLayout.metaHeight).px(),
      )
      val holder = CardHolder(card)
      // Reserve commune : l'appui vise la rangee qui affiche la carte AU MOMENT de l'appui.
      card.setOnClickListener {
        (holder.bindingAdapter as? CardAdapter)?.tapAt(holder.bindingAdapterPosition)
      }
      return holder
    }

    override fun onBindViewHolder(holder: CardHolder, position: Int) {
      val dish = row?.dishes?.getOrNull(position)
      holder.card.configure(dish, revealed)
      holder.card.isClickable = dish != null
    }

    fun tapAt(index: Int) = tap(index)
  }

  companion object {
    const val CARD_TYPE = 1
    // ⚠️ Pas `handler` : ce nom designe deja `View.getHandler()` (nul hors ecran).
    private val mainHandler = Handler(Looper.getMainLooper())
  }
}
