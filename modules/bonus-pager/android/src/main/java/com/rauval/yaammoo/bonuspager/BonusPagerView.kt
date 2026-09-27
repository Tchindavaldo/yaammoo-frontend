package com.rauval.yaammoo.bonuspager

import android.content.Context
import android.graphics.Color
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.roundToInt

/**
 Carrousel natif de la sheet Bonus (Android) : UNE vue qui possede le
 defilement ET le pied de page (pendant de `BonusPagerView.swift`).

 - Les cartes sont des composants React, enfants de cette vue. Elles sont
   montees dans la piste d'un `HorizontalScrollView` pagine (`GroupView` du
   module), a la position calculee par Yoga (page N a `N x largeur`).
 - Le pied de page (galerie + panneau heros) est dessine en natif et recale a
   chaque `onScrollChanged` : meme image que le defilement, aucun aller-retour
   JS. React ne fait rien pendant le geste.
 */
class BonusPagerView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // Props, appliquees ensemble dans `applyProps`.
  var items: List<BPItem> = emptyList()
  var footerHeight = 0f
  var textColor = Color.BLACK
  var iconFontFamily: String? = null

  private val d = resources.displayMetrics.density
  private val pages = BPPages(context)
  private val scroll = BPScroll(context)
  private val footer = BPFooterView(context)
  private var shown: Triple<List<BPItem>, Int, String?>? = null
  private var scrollW = 0
  private var scrollH = 0

  init {
    clipChildren = true
    scroll.addView(pages)
    addView(scroll)
    addView(footer)
    scroll.onScroll = { sync() }
    footer.onSelect = { goTo(it) }
  }

  // Cartes React

  val pageCount: Int get() = pages.childCount

  fun pageAt(index: Int): View? = pages.getChildAt(index)

  fun addPage(child: View, index: Int) {
    pages.addView(child, index)
    relayout()
  }

  fun removePage(child: View) {
    pages.removeView(child)
    relayout()
  }

  fun removePageAt(index: Int) {
    pages.removeViewAt(index)
    relayout()
  }

  // Props

  fun applyProps() {
    val next = Triple(items, textColor, iconFontFamily)
    if (shown != next) {
      shown = next
      footer.configure(items, textColor, iconFontFamily)
    }
    relayout()
  }

  // Mise en page : React ne relance pas celle des vues natives internes, on
  // la fait a la main a chaque changement de taille, de props ou de pages.

  override fun onMeasure(widthSpec: Int, heightSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthSpec), MeasureSpec.getSize(heightSpec))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = layoutInner()

  private fun relayout() {
    scrollW = -1
    if (width > 0) layoutInner() else post { layoutInner() }
  }

  private fun layoutInner() {
    val w = width
    val h = height
    if (w <= 0 || h <= 0) return
    val fh = (footerHeight * d).roundToInt().coerceIn(0, h)
    val pageH = h - fh
    val count = maxOf(items.size, pages.childCount)
    scroll.pageCount = count
    pages.contentW = w * count
    pages.contentH = pageH
    if (scrollW != w || scrollH != pageH) {
      // Largeur changee : on garde la page courante, pas l'offset en pixels.
      val page = currentPage
      scrollW = w
      scrollH = pageH
      exact(scroll, 0, 0, w, pageH)
      scroll.scrollTo(page * w, 0)
    } else {
      exact(scroll, 0, 0, w, pageH)
    }
    exact(footer, 0, pageH, w, fh)
    footer.visibility = if (fh > 0) View.VISIBLE else View.GONE
    sync()
  }

  private fun exact(v: View, x: Int, y: Int, w: Int, h: Int) {
    v.measure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY))
    v.layout(x, y, x + w, y + h)
  }

  private val currentPage: Int
    get() = if (scrollW > 0) maxOf(0, (scroll.scrollX.toFloat() / scrollW).roundToInt()) else 0

  // Defilement

  /** Pied de page cale sur la position EXACTE du scroll (fractionnaire). */
  private fun sync() {
    val w = scroll.width
    if (w <= 0) return
    footer.sync(scroll.scrollX.toFloat() / w)
  }

  /** Tap sur une mini-carte : le pied de page suit l'animation image par image. */
  fun goTo(index: Int) {
    val w = scroll.width
    if (w <= 0 || items.isEmpty()) return
    scroll.smoothScrollTo(index.coerceIn(0, items.size - 1) * w, 0)
  }
}
