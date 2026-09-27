package com.rauval.yaammoo.bonuspager

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import android.view.ViewGroup
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 Pied de page de la sheet Bonus (`BPFooterView.swift`) : carte blanche portant,
 a gauche, la galerie FIXE de mini-cartes et, a droite, le panneau heros.

 Tout est une fonction de `position` (0 = 1er bonus, fractionnaire pendant
 le geste), recue a chaque `onScrollChanged` du scroll natif : aucun
 aller-retour JS, aucun retard sur le doigt.
 */
internal class BPFooterView(context: Context) : ViewGroup(context) {
  var onSelect: ((Int) -> Unit)? = null

  private val d = resources.displayMetrics.density
  private val cardMarginX = 6 * d
  private val cardMarginTop = 10 * d
  private val cardPad = 10 * d
  private val cardRadius = 20 * d
  private val galleryStep = (BPGalleryCard.WIDTH_DP + 8) * d
  private val panelWidth = 168 * d

  private var galleryCards: List<BPGalleryCard> = emptyList()
  private val panel = BPHeroPanel(context)
  private var position = 0f
  private var lastWindow: List<Int> = emptyList()
  private var galleryX = 0f
  private var galleryY = 0f
  private var freeW = 0f
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 0.5f * d
    color = BPColor.black(0.04f)
  }
  private val rect = RectF()

  init {
    setWillNotDraw(false)
    addView(panel)
  }

  fun configure(items: List<BPItem>, textColor: Int, iconFontFamily: String?) {
    galleryCards.forEach { removeView(it) }
    val face = BPFont.icons(iconFontFamily, context.assets)
    galleryCards = items.mapIndexed { i, item ->
      BPGalleryCard(context, item, textColor, face).also { c ->
        c.setOnClickListener { onSelect?.invoke(i) }
        addView(c)
      }
    }
    panel.configure(items, face)
    lastWindow = emptyList()
    layoutChildren()
  }

  override fun onMeasure(widthSpec: Int, heightSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthSpec), MeasureSpec.getSize(heightSpec))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = layoutChildren()

  private fun cardRect(out: RectF) {
    out.set(cardMarginX, cardMarginTop, width - cardMarginX, height.toFloat())
  }

  private fun layoutChildren() {
    if (width == 0 || height == 0) return
    cardRect(rect)
    val inner = RectF(rect.left + cardPad, rect.top + cardPad, rect.right - cardPad, rect.bottom - cardPad)
    // Galerie FIXE : tout l'espace laisse par le panneau (moins 8 d'ecart).
    freeW = maxOf(0f, inner.width() - panelWidth - 8 * d)
    galleryX = inner.left
    galleryY = inner.top + (inner.height() - BPGalleryCard.HEIGHT_DP * d) / 2f
    val panelH = BPHeroPanel.HEIGHT_DP * d
    place(panel, inner.right - panelWidth, inner.top + (inner.height() - panelH) / 2f, panelWidth, panelH)
    lastWindow = emptyList()
    sync(position)
  }

  private fun place(v: View, x: Float, y: Float, w: Float, h: Float) {
    val wi = w.roundToInt()
    val hi = h.roundToInt()
    v.measure(MeasureSpec.makeMeasureSpec(wi, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(hi, MeasureSpec.EXACTLY))
    v.layout(x.roundToInt(), y.roundToInt(), x.roundToInt() + wi, y.roundToInt() + hi)
  }

  /**
   Mini-cartes affichees : autant qu'il en tient (2 minimum), par pages de `k`
   calees pour rester pleines en fin de liste (`galleryWindow` cote RN).
   */
  private fun window(index: Int): List<Int> {
    val n = galleryCards.size
    val k = maxOf(2, ((freeW + 8 * d) / galleryStep).toInt())
    if (n <= k) return (0 until n).toList()
    val start = minOf((index / k) * k, n - k)
    return (start until start + k).toList()
  }

  fun sync(p: Float) {
    position = p
    val idx = maxOf(0f, p).roundToInt().coerceAtMost(maxOf(0, galleryCards.size - 1))
    val win = window(idx)
    if (win != lastWindow) {
      lastWindow = win
      galleryCards.forEachIndexed { i, c ->
        val slot = win.indexOf(i)
        if (slot < 0) {
          c.visibility = View.GONE
        } else {
          c.visibility = View.VISIBLE
          place(c, galleryX + slot * galleryStep, galleryY, BPGalleryCard.WIDTH_DP * d, BPGalleryCard.HEIGHT_DP * d)
        }
      }
    }
    galleryCards.forEachIndexed { i, c ->
      val distance = abs(p - i)
      c.apply(maxOf(0f, 1 - distance), distance < 0.5f)
    }
    panel.sync(p)
  }

  override fun onDraw(c: Canvas) {
    cardRect(rect)
    fill.color = Color.WHITE
    c.drawRoundRect(rect, cardRadius, cardRadius, fill)
    c.drawRoundRect(rect, cardRadius, cardRadius, stroke)
  }
}
