package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.view.View
import kotlin.math.ceil

/**
 Design aere des cartes 4 / 5 / 7 (`homeDesign = "aere"`, `HLAere.swift`),
 repris de `designs/item/aere/` :
 - 4 : degrade sombre, stock en 10 segments en bas ;
 - 5 : barre blanche flottante (stock + jauge) ;
 - 7 : degrade sombre, stock + jauge en bas.
 Libelles (stock, frais, delai) deja calcules en JS (`aere/labels.ts`).
 */
object HLDesign {
  /** Prop `homeDesign`, recue au montage avant la creation des cartes. */
  var aere = false
}

/** Couleurs `DS` utilisees par le design aere. */
object HLAereColor {
  val ink = HLColor.hex("#141416")
  val text2 = HLColor.hex("#3A3A3F")
  val muted = HLColor.hex("#6C6C70")
  val surface = HLColor.hex("#F5F5F7")
  val line = HLColor.hex("#ECECF0")
  val danger = HLColor.hex("#ef4444")
  val dangerInk = HLColor.hex("#B42318")
  val onInkMuted = HLColor.white(0.68f)
  val onInkTrack = HLColor.white(0.28f)
}

/** Degrade sombre des cartes 4 et 7 (`scrimTop` -> transparent -> `scrimEnd`). */
fun hlAereScrim(context: Context, design: Int): HLGradientView = HLGradientView(
  context,
  intArrayOf(HLColor.black(0.35f), HLColor.black(0f), HLColor.black(0f), HLColor.black(0.55f), HLColor.black(0.95f)),
  if (design == 4) floatArrayOf(0f, 0.24f, 0.45f, 0.7f, 1f) else floatArrayOf(0f, 0.22f, 0.45f, 0.7f, 1f),
)

// Carte 4 : stock en segments

class HLAereV4Bottom(context: Context) : HLBox(context) {
  private val stock = HLLabel(context)
  private val bars = List(SEGMENTS) { View(context) }
  // Fonds crees une fois : au scroll, `configure` ne fait que changer leur couleur.
  private val fills = List(SEGMENTS) { roundedBackground(HLAereColor.onInkTrack, 2f) }

  init {
    addView(stock)
    bars.forEachIndexed { i, v ->
      v.background = fills[i]
      addView(v)
    }
    onPlace = { w, _ ->
      // paddingHorizontal 14, paddingBottom 14 ; segments separes de 3.
      val iw = w - 28f
      stock.frame(14f, 0f, iw, 21f)
      val bw = (iw - 3f * (SEGMENTS - 1)) / SEGMENTS
      bars.forEachIndexed { i, v -> v.frame(14f + i * (bw + 3f), 29f, bw, 5f) }
    }
  }

  fun configure(m: HLMenu) {
    // `gap: 6` entre la valeur et l'unite.
    stock.text = HLRuns()
      .run(m.stockValue, 900, 17f, Color.WHITE).gap(6f)
      .run(m.stockUnit, 700, 11f, HLAereColor.onInkMuted)
      .build()
    val filled = ceil(m.stockRatio * SEGMENTS).toInt()
    // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
    val on = if (m.stockLow) HLAereColor.danger else Color.WHITE
    fills.forEachIndexed { i, d -> d.setColor(if (i < filled) on else HLAereColor.onInkTrack) }
    relayout()
  }

  companion object {
    private const val SEGMENTS = 10
    /** paddingBottom 14 + segments 5 + gap 8 + texte 21. */
    const val HEIGHT = 48f
  }
}

// Carte 5 : barre blanche flottante

class HLAereV5Bar(context: Context) : HLBox(context) {
  private val stock = HLLabel(context)
  private val track = HLBox(context)
  private val fill = View(context)
  private val fillBg = roundedBackground(HLAereColor.ink, 2f)
  private var ratio = 0f

  init {
    background = roundedBackground(Color.WHITE, 14f)
    elevation = 6f * HLDim.density
    // Pas de decoupe de la jauge : le remplissage a ses propres coins.
    track.background = roundedBackground(HLAereColor.line, 2f)
    fill.background = fillBg
    track.addView(fill)
    addAll(stock, track)
    onPlace = { w, h ->
      // paddingHorizontal 12, gap 10 ; la jauge prend le reste de la largeur.
      val sw = minOf(stock.textWidth(), w - 24f - 30f)
      stock.frame(12f, 10f, sw, 15f)
      val tx = 12f + sw + 10f
      val tw = maxOf(0f, w - 12f - tx)
      track.frame(tx, (h - 4f) / 2f, tw, 4f)
      fill.frame(0f, 0f, tw * ratio, 4f)
    }
  }

  fun configure(m: HLMenu) {
    val unit = if (m.stockUnit.isEmpty()) "" else " ${m.stockUnit}"
    // Rouge fonce : le rouge vif se confondait avec l'orange de marque.
    val color = if (m.stockLow) HLAereColor.dangerInk else HLAereColor.ink
    stock.text = HLRuns().run(m.stockValue + unit, 900, 12f, color).build()
    fillBg.setColor(color)
    ratio = m.stockRatio
    relayout()
  }

  companion object {
    /** paddingVertical 10 x 2 + texte 15. */
    const val HEIGHT = 35f
    /** Marges de la barre dans la carte (left / right / bottom 10). */
    const val INSET = 10f
  }
}

// Carte 7 : stock + jauge

class HLAereV7Bottom(context: Context) : HLBox(context) {
  private val stock = HLLabel(context)
  private val track = HLBox(context)
  private val fill = View(context)
  private val fillBg = roundedBackground(Color.WHITE, 2f)
  private var ratio = 0f

  init {
    // Pas de decoupe de la jauge : le remplissage a ses propres coins.
    track.background = roundedBackground(HLAereColor.onInkTrack, 2f)
    fill.background = fillBg
    track.addView(fill)
    addAll(stock, track)
    onPlace = { w, _ ->
      // paddingHorizontal 10, paddingBottom 12, gap 6.
      val iw = w - 20f
      stock.frame(10f, 0f, iw, 15f)
      track.frame(10f, 21f, iw, 4f)
      fill.frame(0f, 0f, iw * ratio, 4f)
    }
  }

  fun configure(m: HLMenu) {
    val runs = HLRuns().run(m.stockValue, 900, 12f, Color.WHITE)
    if (m.stockUnit.isNotEmpty()) runs.run(" ${m.stockUnit}", 700, 10f, HLAereColor.onInkMuted)
    stock.text = runs.build()
    // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
    fillBg.setColor(if (m.stockLow) HLAereColor.danger else Color.WHITE)
    ratio = m.stockRatio
    relayout()
  }

  companion object {
    /** paddingBottom 12 + jauge 4 + gap 6 + texte 15. */
    const val HEIGHT = 37f
  }
}

// Lignes sous la carte (`V4AereMeta`, `V5AereMeta`, `V7AereMeta`)

/** Textes aeres : titre, droite du titre, ligne 2 gauche, ligne 2 droite. */
class HLAereMetaTexts(
  val title: CharSequence,
  val titleRight: CharSequence?,
  val lineLeft: CharSequence,
  val lineRight: CharSequence?,
)

fun hlAereMeta(design: Int, m: HLMenu): HLAereMetaTexts {
  val title = HLRuns().run(m.title, 900, 13f, HLAereColor.ink).build()
  val votes = if (design == 7) "(${m.votes})" else "(${m.votes} avis)"
  val rating = HLRuns()
    .icon("star", if (design == 7) 11f else 12f, HLColor.starYellow).gap(4f)
    .run(m.rating, 700, 11f, HLAereColor.ink).gap(4f)
    .run(votes, 600, 11f, HLAereColor.muted)
    .build()
  val fee = HLRuns()
    .run("Livraison ", 700, 11f, HLAereColor.text2)
    .run(m.feeText, 800, 11f, if (m.feeFree) HLColor.accent else HLAereColor.ink)
  return when (design) {
    4 -> HLAereMetaTexts(
      title, rating, fee.build(),
      HLRuns().run("Livré en ", 700, 11f, HLAereColor.text2).run(m.eta, 900, 11f, HLAereColor.ink).build(),
    )
    5 -> HLAereMetaTexts(
      title, rating,
      fee.run(" · Livré en ", 700, 11f, HLAereColor.text2).run(m.eta, 900, 11f, HLAereColor.ink).build(),
      null,
    )
    else -> HLAereMetaTexts(
      title, rating,
      fee.run(" · ", 700, 11f, HLAereColor.text2).run(m.eta, 900, 11f, HLAereColor.ink).build(),
      null,
    )
  }
}
