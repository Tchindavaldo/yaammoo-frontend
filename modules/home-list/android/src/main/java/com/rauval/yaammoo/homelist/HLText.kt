package com.rauval.yaammoo.homelist

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.TextPaint
import android.text.style.ForegroundColorSpan
import android.text.style.MetricAffectingSpan
import android.text.style.ReplacementSpan
import com.facebook.react.common.assets.ReactFontManager

/** Police + taille (+ espacement des lettres, en em) d'un fragment de texte. */
class HLFontSpan(
  private val typeface: Typeface,
  private val sizePx: Float,
  private val letterSpacingEm: Float = 0f,
) : MetricAffectingSpan() {
  override fun updateMeasureState(p: TextPaint) = style(p)
  override fun updateDrawState(p: TextPaint) = style(p)

  private fun style(p: TextPaint) {
    p.typeface = typeface
    p.textSize = sizePx
    p.letterSpacing = letterSpacingEm
  }
}

/** Espace fixe entre deux fragments : le `gap` RN (crenage iOS `HLKerned`). */
class HLGapSpan(private val px: Int) : ReplacementSpan() {
  override fun getSize(paint: Paint, text: CharSequence?, start: Int, end: Int, fm: Paint.FontMetricsInt?): Int {
    if (fm != null) paint.getFontMetricsInt(fm)
    return px
  }

  override fun draw(
    canvas: Canvas, text: CharSequence?, start: Int, end: Int, x: Float,
    top: Int, y: Int, bottom: Int, paint: Paint,
  ) = Unit
}

/**
 Assemble des fragments (texte, icones, espaces) en un seul texte, equivalent
 de `HLText` / `HLRun` / `HLKerned` cote iOS.
 */
class HLRuns {
  private val sb = SpannableStringBuilder()

  /** `kern` : espacement des lettres en dp (comme le `kern` iOS). */
  fun run(text: String, weight: Int, sizeDp: Float, color: Int, kern: Float = 0f): HLRuns {
    styled(text, HLFont.of(weight), sizeDp, color, if (kern != 0f) kern / sizeDp else 0f)
    return this
  }

  fun icon(name: String, sizeDp: Float, color: Int): HLRuns {
    // Glyphe inconnu : pas d'icone (la police Ionicons est chargee par l'app).
    val glyph = HLIcons.glyphs[name] ?: return this
    styled(glyph, HLIcons.typeface(), sizeDp, color, 0f)
    return this
  }

  fun gap(dp: Float): HLRuns {
    val start = sb.length
    sb.append('​')
    sb.setSpan(HLGapSpan(dp.px()), start, sb.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    return this
  }

  fun build(): CharSequence = sb

  private fun styled(text: String, face: Typeface, sizeDp: Float, color: Int, letterSpacingEm: Float) {
    if (text.isEmpty()) return
    val start = sb.length
    sb.append(text)
    val end = sb.length
    sb.setSpan(HLFontSpan(face, sizeDp * HLDim.density, letterSpacingEm), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    sb.setSpan(ForegroundColorSpan(color), start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
  }
}

/** Icones : police Ionicons deja chargee par l'app (prop `icons`). */
object HLIcons {
  var fontFamily: String? = null
    set(value) {
      field = value
      face = null
    }
  var glyphs: Map<String, String> = emptyMap()
  private var face: Typeface? = null

  fun typeface(): Typeface {
    face?.let { return it }
    val family = fontFamily ?: "ionicons"
    return ReactFontManager.getInstance().getTypeface(family, Typeface.NORMAL, HLFont.assets).also { face = it }
  }
}
