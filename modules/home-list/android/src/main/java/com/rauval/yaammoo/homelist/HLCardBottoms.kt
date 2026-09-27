package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.ImageView

/**
 Zones basses des cartes (`designs/item/parts/CardBottom.tsx`, `HLCardBottoms.swift`) :
 - variant 7 : « Prochaine » + « livraison · HH:MM » + pastille frais, sans fond ;
 - variant 4 : barre floutee « N disponible » + progression / livraison ;
 - variant 5 : barre floutee livraison + pastille frais.
 Chaque vue connait sa hauteur (`HEIGHT`) : la carte la pose en bas.
 */

/** Pastille des frais : fond accent, texte blanc 10/800, padding 7x3, rayon 10. */
fun hlFeePill(context: Context): HLLabel = HLLabel(context).apply {
  setFont(800, 10f, Color.WHITE)
  background = roundedBackground(HLColor.accent, 10f)
  insets = floatArrayOf(7f, 3f, 7f, 3f)
}

/** Colonne « Prochaine » des barres 4 et 5 (espacement des lettres 0,8). */
private fun nextLabelText(): CharSequence =
  HLRuns().run("Prochaine", 700, 10f, HLColor.deliveryLabel, kern = 0.8f).build()

/**
 Barre floutee du bas des cartes 4 et 5 (`BlurView intensity=60 tint=light` +
 voile blanc). Rendu `baked` seulement : derriere la barre il n'y a que la
 photo de SA carte, immobile par rapport a elle ; on l'affiche floutee d'avance
 (`HLImage.setBlurred`), calee sur la photo nette. Le rendu `live` d'iOS (flou
 recalcule a chaque image) n'a pas d'equivalent bon marche sur Android.
 Les sous-vues de la barre vont dans `content`.
 */
class HLBlurBar(context: Context) : HLBox(context) {
  private val backdrop = HLImageView(context).apply { scaleType = ImageView.ScaleType.FIT_XY }
  private val veil = View(context).apply { setBackgroundColor(HLColor.white(VEIL)) }
  val content = HLBox(context)

  /** Cadre de la photo de la carte, dans le repere de la barre (dp). */
  var photoFrame = floatArrayOf(0f, 0f, 0f, 0f)

  init {
    addAll(backdrop, veil, content)
    onPlace = { w, h ->
      backdrop.frame(photoFrame[0], photoFrame[1], photoFrame[2], photoFrame[3])
      veil.frame(0f, 0f, w, h)
      content.frame(0f, 0f, w, h)
    }
  }

  /** Photo de la carte (URL), floutee une fois ; `null` = voile seul. */
  fun setPhoto(url: String?, cardW: Float, cardH: Float) {
    HLImage.setBlurred(backdrop, url, cardW, cardH)
  }

  companion object {
    /** Voile du rendu `baked` (cf. `HLBlurBar.bakedVeil` iOS). */
    private const val VEIL = 0.62f
    const val MODE = "baked"
  }
}

/** Rond blanc 20 dp portant l'eclair accent (10 dp). */
class HLFlashBadge(context: Context) : HLBox(context) {
  private val icon = HLLabel(context).apply { centered = true }

  init {
    background = roundedBackground(Color.WHITE, 10f)
    addView(icon)
    onPlace = { w, h -> icon.frame(0f, 0f, w, h) }
  }

  fun refresh() {
    icon.text = HLRuns().icon("flash", 10f, HLColor.accent).build()
  }
}

// Variant 7

class HLV7BottomZone(context: Context) : HLBox(context) {
  private val nextLabel = HLLabel(context).apply {
    setFont(800, 11f, HLColor.white(0.7f))
    text = "Prochaine"
  }
  private val delivery = HLLabel(context).apply { setFont(900, 11f, Color.WHITE) }
  private val fee = hlFeePill(context)

  init {
    addAll(nextLabel, delivery, fee)
    onPlace = { w, _ ->
      // paddingHorizontal 10, paddingBottom 10 ; rangee de 18 (pastille).
      nextLabel.frame(10f, 0f, w - 20f, 14f)
      val rowY = 14f
      val dw = delivery.textWidth()
      delivery.frame(10f, rowY + 2.5f, dw, 14f)
      val ph = fee.fitHeight()
      fee.frame(10f + dw + 4f, rowY + (18f - ph) / 2f, fee.fitWidth(), ph)
    }
  }

  fun configure(deliveryTime: String, feeLabel: String) {
    delivery.text = "livraison · $deliveryTime"
    fee.text = feeLabel
    relayout()
  }

  companion object {
    const val HEIGHT = 42f
  }
}

// Variant 4

class HLStockDeliveryBar(context: Context) : HLBox(context) {
  val blur = HLBlurBar(context)
  private val stockLabel = HLLabel(context)
  private val track = HLBox(context)
  private val fill = View(context)
  private val strip = HLBox(context)
  private val badge = HLFlashBadge(context)
  private val nextLabel = HLLabel(context).apply { text = nextLabelText() }
  private val delivery = HLLabel(context).apply { setFont(800, 11f, Color.BLACK) }
  private var stockRatio = 0f

  init {
    addView(blur)
    track.background = roundedBackground(HLColor.black(0.06f), 2f)
    track.roundCorners(2f)
    fill.background = roundedBackground(HLColor.accent, 2f)
    track.addView(fill)
    strip.background = roundedBackground(HLColor.black(0.04f), 14f)
    strip.addAll(badge, nextLabel, delivery)
    blur.content.addAll(stockLabel, track, strip)
    onPlace = { w, h -> blur.frame(0f, 0f, w, h) }
    blur.content.onPlace = { w, _ -> placeContent(w) }
  }

  private fun placeContent(w: Float) {
    // paddingHorizontal 16, paddingVertical 10, gap 10.
    val textW = maxOf(nextLabel.textWidth(), delivery.textWidth())
    val stripW = 10f + 20f + 6f + textW + 10f
    val stripH = 37f
    strip.frame(w - 16f - stripW, 10f, stripW, stripH)
    badge.frame(10f, (stripH - 20f) / 2f, 20f, 20f)
    nextLabel.frame(36f, 6f, textW, 12f)
    delivery.frame(36f, 18f, textW, 13f)

    val leftW = maxOf(0f, w - 16f - stripW - 10f - 16f)
    val leftH = 16f + 6f + 4f
    val leftY = 10f + (stripH - leftH) / 2f
    // Comme l'original (`flexShrink: 0`) : le texte n'est jamais tronque.
    val stockW = maxOf(leftW, stockLabel.textWidth())
    stockLabel.frame(16f, leftY, stockW, 16f)
    track.frame(16f, leftY + 22f, leftW, 4f)
    fill.frame(0f, 0f, leftW * stockRatio, 4f)
  }

  fun configure(stock: Int, deliveryTime: String) {
    // `gap: 5` entre le nombre et « disponible ».
    stockLabel.text = HLRuns()
      .run("$stock", 700, 13f, Color.BLACK).gap(5f)
      .run("disponible", 700, 13f, Color.BLACK)
      .build()
    stockRatio = (stock / 100f).coerceIn(0f, 1f)
    delivery.text = "Livraison $deliveryTime"
    badge.refresh()
    blur.content.relayout()
  }

  companion object {
    const val HEIGHT = 57f
  }
}

// Variant 5

class HLV5BottomBar(context: Context) : HLBox(context) {
  val blur = HLBlurBar(context)
  private val badge = HLFlashBadge(context)
  private val nextLabel = HLLabel(context).apply { text = nextLabelText() }
  private val delivery = HLLabel(context).apply { setFont(800, 11f, Color.BLACK) }
  private val fee = hlFeePill(context)

  init {
    addView(blur)
    blur.content.addAll(badge, nextLabel, delivery, fee)
    onPlace = { w, h -> blur.frame(0f, 0f, w, h) }
    blur.content.onPlace = { w, h ->
      // paddingHorizontal 12, paddingVertical 6, gap 8 ; colonne 12 + 18.
      badge.frame(12f, (h - 20f) / 2f, 20f, 20f)
      val x = 12f + 20f + 8f
      nextLabel.frame(x, 6f, w - x - 12f, 12f)
      val dw = delivery.textWidth()
      delivery.frame(x, 18f + 2.5f, dw, 13f)
      val ph = fee.fitHeight()
      fee.frame(x + dw + 5f, 18f + (18f - ph) / 2f, fee.fitWidth(), ph)
    }
  }

  fun configure(deliveryTime: String, feeLabel: String) {
    delivery.text = "Livraison $deliveryTime"
    fee.text = feeLabel
    badge.refresh()
    blur.content.relayout()
  }

  companion object {
    const val HEIGHT = 42f
  }
}
