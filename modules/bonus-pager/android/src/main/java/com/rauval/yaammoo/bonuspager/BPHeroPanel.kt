package com.rauval.yaammoo.bonuspager

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.TextPaint
import android.view.View
import kotlin.math.floor

/**
 Panneau heros du pied de page (`BonusPagerInfo` RN / `BPHeroPanel.swift`) :
 FIXE, rien ne glisse. Chaque element s'anime SEUL avec la position du scroll :

 - couleurs (icone, fond du badge, filigrane, point et libelle de statut,
   jauge) : melange continu entre les deux bonus encadrants ;
 - textes et glyphe : une « suite » par valeurs identiques consecutives (un
   texte inchange ne bouge pas), sinon court fondu decale par element ;
 - jauge : remplie en continu de 0 (1er bonus) a pleine (dernier).
 */
internal class BPHeroPanel(context: Context) : View(context) {
  companion object {
    /** Ligne icone 22 + gap 6 + nom 17 + gap 6 + statut 14. */
    const val HEIGHT_DP = 65f
    const val GAUGE_W_DP = 40f
    /** Demi-largeur d'un fondu, en fraction de carte. */
    private const val HALF = 0.15f
  }

  private class Run(val from: Int, val to: Int)

  private val d = resources.displayMetrics.density
  private var items: List<BPItem> = emptyList()
  private var iconFace: Typeface? = null
  private var ghost = emptyList<Run>()
  private var icon = emptyList<Run>()
  private var issuer = emptyList<Run>()
  private var name = emptyList<Run>()
  private var status = emptyList<Run>()
  private var position = 0f
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val text = TextPaint(Paint.ANTI_ALIAS_FLAG)
  private val rect = RectF()

  fun configure(items: List<BPItem>, iconFace: Typeface?) {
    this.items = items
    this.iconFace = iconFace
    ghost = runs(items.indices.map { "$it" })
    icon = runs(items.map { it.icon })
    issuer = runs(items.map { "${it.issuer}|${it.remaining ?: ""}" })
    name = runs(items.map { it.name })
    status = runs(items.map { it.statusLabel })
    invalidate()
  }

  fun sync(p: Float) {
    if (p == position) return
    position = p
    invalidate()
  }

  private fun runs(keys: List<String>): List<Run> {
    val out = ArrayList<Run>()
    var i = 0
    while (i < keys.size) {
      var j = i
      while (j + 1 < keys.size && keys[j + 1] == keys[i]) j++
      out.add(Run(i, j))
      i = j + 1
    }
    return out
  }

  /** Meme formule que `BPFadeStack.fade` (iOS) et `runOpacity` (RN). */
  private fun alpha(r: Run, q: Float, n: Int, offset: Float): Float {
    var a = 1f
    if (r.from > 0) {
      val c = r.from - 0.5f + offset
      a = minOf(a, (q - (c - HALF)) / (2 * HALF))
    }
    if (r.to < n - 1) {
      val c = r.to + 0.5f + offset
      a = minOf(a, ((c + HALF) - q) / (2 * HALF))
    }
    return a.coerceIn(0f, 1f)
  }

  override fun onDraw(c: Canvas) {
    val n = items.size
    if (n == 0) return
    val w = width.toFloat()
    val last = (n - 1).toFloat()
    val q = position.coerceIn(0f, last)
    val lo = floor(q).toInt()
    val hi = minOf(lo + 1, n - 1)
    val t = q - lo
    val tint = BPColor.mix(items[lo].color, items[hi].color, t)
    val st = BPColor.mix(items[lo].statusColor, items[hi].statusColor, t)

    // Filigrane (numero geant), cale en haut a droite, deborde et rogne.
    text.typeface = BPFont.weight(900)
    text.textSize = 96 * d
    text.letterSpacing = -4f / 96f
    text.textAlign = Paint.Align.RIGHT
    for (r in ghost) {
      val a = alpha(r, q, n, -0.2f)
      if (a <= 0f) continue
      text.color = BPColor.withAlpha(tint, 0.07f * a)
      val fm = text.fontMetrics
      c.drawText("${r.from + 1}", w + 6 * d, -18 * d + (96 * d - (fm.descent + fm.ascent)) / 2f, text)
    }
    text.letterSpacing = 0f
    text.textAlign = Paint.Align.LEFT

    // Badge d'icone : fond partage, glyphe par suite.
    fill.color = BPColor.withAlpha(tint, 0x1f / 255f)
    rect.set(0f, 0f, 22 * d, 22 * d)
    c.drawRoundRect(rect, 7 * d, 7 * d, fill)
    iconFace?.let { face ->
      text.typeface = face
      text.textSize = 13 * d
      text.textAlign = Paint.Align.CENTER
      val fm = text.fontMetrics
      for (r in icon) {
        val a = alpha(r, q, n, -0.1f)
        if (a <= 0f) continue
        text.color = BPColor.fade(tint, a)
        c.drawText(items[r.from].icon, rect.centerX(), rect.centerY() - (fm.ascent + fm.descent) / 2f, text)
      }
      text.textAlign = Paint.Align.LEFT
    }

    // Emetteur + « · N restantes ».
    for (r in issuer) {
      val a = alpha(r, q, n, -0.05f)
      if (a <= 0f) continue
      val it = items[r.from]
      text.typeface = BPFont.weight(600)
      text.textSize = 10 * d
      val remW = it.remaining?.let { s -> text.measureText(s) } ?: 0f
      text.typeface = BPFont.weight(700)
      text.textSize = 11 * d
      text.color = BPColor.black(0.6f * a)
      val x = 28 * d
      val issuerW = BPText.draw(c, text, it.issuer, x, 0f, 22 * d, w - x - (if (remW > 0) remW + 6 * d else 0f))
      it.remaining?.let { s ->
        text.typeface = BPFont.weight(600)
        text.textSize = 10 * d
        text.color = BPColor.black(0.35f * a)
        BPText.draw(c, text, s, x + issuerW + 6 * d, 0f, 22 * d, remW + 1)
      }
    }

    // Nom du bonus.
    text.typeface = BPFont.weight(800)
    text.textSize = 14 * d
    for (r in name) {
      val a = alpha(r, q, n, 0f)
      if (a <= 0f) continue
      text.color = BPColor.black(0.82f * a)
      BPText.draw(c, text, items[r.from].name, 0f, 28 * d, 17 * d, w)
    }

    // Statut : point + libelle (couleur continue), jauge fixe a droite.
    val rowY = 51 * d
    val rowH = 14 * d
    fill.color = st
    c.drawCircle(3.5f * d, rowY + rowH / 2f, 3.5f * d, fill)
    text.typeface = BPFont.weight(800)
    text.textSize = 11 * d
    val gw = GAUGE_W_DP * d
    for (r in status) {
      val a = alpha(r, q, n, 0.1f)
      if (a <= 0f) continue
      text.color = BPColor.fade(st, a)
      BPText.draw(c, text, items[r.from].statusLabel, 12 * d, rowY, rowH, w - 12 * d - 9 * d - gw)
    }
    fill.color = BPColor.black(0.08f)
    rect.set(w - gw, rowY + (rowH - 3 * d) / 2f, w, rowY + (rowH + 3 * d) / 2f)
    c.drawRoundRect(rect, 1.5f * d, 1.5f * d, fill)
    fill.color = tint
    rect.right = rect.left + gw * (if (last > 0) q / last else 1f)
    c.drawRoundRect(rect, 1.5f * d, 1.5f * d, fill)
  }
}
