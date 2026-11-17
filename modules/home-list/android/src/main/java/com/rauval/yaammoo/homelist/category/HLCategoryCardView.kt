package com.rauval.yaammoo.homelist.category

import android.content.Context
import android.graphics.Color
import android.view.View
import com.rauval.yaammoo.homelist.HLAereColor
import com.rauval.yaammoo.homelist.HLBox
import com.rauval.yaammoo.homelist.HLColor
import com.rauval.yaammoo.homelist.HLImage
import com.rauval.yaammoo.homelist.HLImageView
import com.rauval.yaammoo.homelist.HLLabel
import com.rauval.yaammoo.homelist.HLRuns
import com.rauval.yaammoo.homelist.HLSkeletonView
import com.rauval.yaammoo.homelist.addAll
import com.rauval.yaammoo.homelist.frame
import com.rauval.yaammoo.homelist.hlAereScrim
import com.rauval.yaammoo.homelist.roundCorners
import com.rauval.yaammoo.homelist.roundedBackground

/**
 Carte plat de la liste categorie. Copie dediee (R16) de la carte V7 aeree de
 `HLMenuCardView` : photo, degrade sombre, prix, stock + jauge en bas, puis
 SOUS la carte les deux lignes d'infos (nom + note, livraison + delai) et
 leurs squelettes. Pendant de `HLCategoryCardCell.swift`.
 */
class HLCategoryCardView(context: Context) : HLBox(context) {
  private val size = HLCLayout.card

  // Contenu reel (fondu entrant) et squelettes (fondu sortant).
  val content = HLBox(context)
  val skeletons = HLBox(context)

  private val card = HLBox(context)
  private val image = HLImageView(context)
  private val scrim = hlAereScrim(context, 7)
  private val price = HLLabel(context).apply {
    setFont(900, 12f, Color.BLACK)
    background = roundedBackground(Color.WHITE, 12f)
    insets = floatArrayOf(10f, 4f, 10f, 4f)
  }
  private val stockBar = HLCategoryStockBar(context)

  private val titleLabel = HLLabel(context)
  private val titleRight = HLLabel(context)
  private val lineLeft = HLLabel(context)

  private val cardSkeleton = HLSkeletonView(context, size.radius)
  private val metaBar1 = View(context).apply { background = roundedBackground(HLColor.skeletonBase, 4f) }
  private val metaBar2 = View(context).apply { background = roundedBackground(HLColor.skeletonBase, 4f) }

  init {
    addAll(content, skeletons)
    content.addView(card)
    card.roundCorners(size.radius)
    card.setBackgroundColor(HLAereColor.ink)
    card.addAll(image, scrim, stockBar, price)
    content.addAll(titleLabel, titleRight, lineLeft)
    skeletons.addAll(cardSkeleton, metaBar1, metaBar2)

    onPlace = { w, h ->
      content.frame(0f, 0f, w, h)
      skeletons.frame(0f, 0f, w, h)
    }
    card.onPlace = { w, h ->
      image.frame(0f, 0f, w, h)
      scrim.frame(0f, 0f, w, h)
      stockBar.frame(0f, h - HLCategoryStockBar.HEIGHT, w, HLCategoryStockBar.HEIGHT)
      price.frame(8f, 8f, price.fitWidth(), price.fitHeight())
    }
    content.onPlace = { _, _ -> placeContent() }
    skeletons.onPlace = { _, _ ->
      // Squelettes : carte, puis deux barres (70 % x 12, 50 % x 10).
      cardSkeleton.frame(0f, 0f, size.width, size.height)
      metaBar1.frame(4f, size.height + 10f, size.width * 0.7f, 12f)
      metaBar2.frame(4f, size.height + 28f, size.width * 0.5f, 10f)
    }
  }

  private fun placeContent() {
    val w = size.width
    val h = size.height
    card.frame(0f, 0f, w, h)
    // ItemMeta : paddingTop 8, paddingLeft 4, gap 3 ; lignes de 16.
    val metaX = 4f
    val row1Y = h + 8f
    val row2Y = row1Y + 16f + 3f
    val trw = titleRight.textWidth()
    titleRight.frame(w - trw, row1Y, trw, 16f)
    titleLabel.frame(metaX, row1Y, maxOf(0f, w - trw - 4f - metaX), 16f)
    lineLeft.frame(metaX, row2Y, maxOf(0f, w - metaX), 16f)
  }

  /** `dish == null` : carte d'un fantome, squelette seul. `revealed` : etat de la rangee. */
  fun configure(dish: HLCDish?, revealed: Boolean) {
    if (dish == null) {
      HLImage.clear(image)
      titleLabel.text = null
      titleRight.text = null
      lineLeft.text = null
      price.text = null
      setRevealed(false)
      return
    }
    HLImage.set(image, dish.image, size.width, size.height)
    price.text = dish.price
    stockBar.configure(dish)
    titleLabel.text = HLRuns().run(dish.title, 900, 13f, HLAereColor.ink).build()
    // Sans avis : la note vaut « Nouveau » (JS), pas de « (0) ».
    titleRight.text = HLRuns()
      .icon("star", 11f, HLColor.starYellow).gap(4f)
      .run(dish.rating, 700, 11f, HLAereColor.ink).gap(4f)
      .run(if (dish.votes > 0) "(${dish.votes})" else "", 600, 11f, HLAereColor.muted)
      .build()
    lineLeft.text = HLRuns()
      .run("Livraison ", 700, 11f, HLAereColor.text2)
      .run(dish.feeText, 800, 11f, if (dish.feeFree) HLColor.accent else HLAereColor.ink)
      .run(" · ", 700, 11f, HLAereColor.text2)
      .run(dish.eta, 900, 11f, HLAereColor.ink)
      .build()
    setRevealed(revealed)
    card.relayout()
    content.relayout()
  }

  /** Bascule instantanee (le fondu est anime par la rangee). */
  fun setRevealed(revealed: Boolean) {
    content.animate().cancel()
    skeletons.animate().cancel()
    content.alpha = if (revealed) 1f else 0f
    skeletons.alpha = if (revealed) 0f else 1f
    setBreathing(!revealed)
  }

  fun setBreathing(on: Boolean) {
    cardSkeleton.setBreathing(on)
  }

  /** `activeOpacity={0.9}` des cartes. */
  override fun setPressed(pressed: Boolean) {
    super.setPressed(pressed)
    alpha = if (pressed) 0.9f else 1f
  }
}

/** Bas de carte : stock (« 12 plats dispo ») + jauge. Copie de `HLAereV7Bottom`. */
class HLCategoryStockBar(context: Context) : HLBox(context) {
  private val stock = HLLabel(context)
  private val track = HLBox(context)
  private val fill = View(context)
  private val fillBg = roundedBackground(Color.WHITE, 2f)
  private var ratio = 0f

  init {
    track.background = roundedBackground(HLAereColor.onInkTrack, 2f)
    fill.background = fillBg
    track.addView(fill)
    addAll(stock, track)
    onPlace = { w, _ ->
      val iw = w - 20f
      stock.frame(10f, 0f, iw, 15f)
      track.frame(10f, 21f, iw, 4f)
      fill.frame(0f, 0f, iw * ratio, 4f)
    }
  }

  fun configure(d: HLCDish) {
    val runs = HLRuns().run(d.stockValue, 900, 12f, Color.WHITE)
    if (d.stockUnit.isNotEmpty()) runs.run(" ${d.stockUnit}", 700, 10f, HLAereColor.onInkMuted)
    stock.text = runs.build()
    // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
    fillBg.setColor(if (d.stockLow) HLAereColor.danger else Color.WHITE)
    ratio = d.stockRatio
    relayout()
  }

  companion object {
    /** paddingBottom 12 + jauge 4 + gap 6 + texte 15. */
    const val HEIGHT = 37f
  }
}
