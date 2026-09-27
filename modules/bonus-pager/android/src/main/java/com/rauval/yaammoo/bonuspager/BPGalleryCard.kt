package com.rauval.yaammoo.bonuspager

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.TextPaint
import android.text.TextUtils
import android.view.View

/** Dessin de texte sur une ligne : centre verticalement dans `[top, top+h]`, ellipse a `maxW`. */
internal object BPText {
  fun draw(c: Canvas, p: TextPaint, text: String, x: Float, top: Float, h: Float, maxW: Float): Float {
    if (text.isEmpty() || maxW <= 0f) return 0f
    val s = TextUtils.ellipsize(text, p, maxW, TextUtils.TruncateAt.END).toString()
    val fm = p.fontMetrics
    val baseline = top + (h - (fm.descent + fm.ascent)) / 2f
    c.drawText(s, x, baseline, p)
    return p.measureText(s)
  }
}

/**
 Mini-carte de la galerie (`BonusGalleryCard` / `BPGalleryCard.swift`),
 dessinee sur le canvas. Fond, badge, barre et couleur d'icone suivent `focus`
 (1 = carte centree, 0 = a une carte ou plus) ; la graisse du libelle bascule
 a mi-chemin (`active`).
 */
internal class BPGalleryCard(
  context: Context,
  private val item: BPItem,
  private val activeTextColor: Int,
  private val iconFace: Typeface?,
) : View(context) {
  companion object {
    const val WIDTH_DP = 72f
    /** paddingVertical 8 + icone 26 + gap 5 + libelle 15 + gap 5 + barre 4 + 8. */
    const val HEIGHT_DP = 71f
  }

  private val d = resources.displayMetrics.density
  private var focus = 0f
  private var active = false
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val text = TextPaint(Paint.ANTI_ALIAS_FLAG)
  private val rect = RectF()

  private val restBg = BPColor.black(0.04f)
  private val fullBg = BPColor.withAlpha(item.color, 0x12 / 255f)
  private val restIconBg = BPColor.black(0.06f)
  private val fullIconBg = BPColor.withAlpha(item.color, 0x1f / 255f)
  private val neutral = BPColor.black(0.35f)

  fun apply(f: Float, a: Boolean) {
    if (f == focus && a == active) return
    focus = f
    active = a
    invalidate()
  }

  override fun onDraw(c: Canvas) {
    val w = width.toFloat()
    val h = height.toFloat()
    fill.color = BPColor.mix(restBg, fullBg, focus)
    rect.set(0f, 0f, w, h)
    c.drawRoundRect(rect, 14 * d, 14 * d, fill)

    val tint = BPColor.mix(neutral, item.color, focus)
    fill.color = BPColor.mix(restIconBg, fullIconBg, focus)
    rect.set(10 * d, 8 * d, 36 * d, 34 * d)
    c.drawRoundRect(rect, 8 * d, 8 * d, fill)
    if (iconFace != null && item.icon.isNotEmpty()) {
      text.typeface = iconFace
      text.textSize = 15 * d
      text.color = tint
      text.textAlign = Paint.Align.CENTER
      val fm = text.fontMetrics
      c.drawText(item.icon, rect.centerX(), rect.centerY() - (fm.ascent + fm.descent) / 2f, text)
      text.textAlign = Paint.Align.LEFT
    }

    text.typeface = BPFont.weight(if (active) 800 else 700)
    text.textSize = 12 * d
    text.color = if (active) activeTextColor else BPColor.black(0.7f)
    BPText.draw(c, text, item.label, 10 * d, 39 * d, 15 * d, w - 20 * d)

    // Barre : 34 % au repos, 100 % au centre.
    fill.color = BPColor.black(0.08f)
    rect.set(10 * d, 59 * d, w - 10 * d, 63 * d)
    c.drawRoundRect(rect, 2 * d, 2 * d, fill)
    fill.color = tint
    rect.right = rect.left + (rect.width() * (0.34f + 0.66f * focus))
    c.drawRoundRect(rect, 2 * d, 2 * d, fill)
  }
}
