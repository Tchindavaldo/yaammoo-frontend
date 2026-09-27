package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.view.View

/**
 Une carte menu (`DesignItem` + `DesignItemCard` + `ItemMeta`, `HLMenuCardCell.swift`)
 dans le design de sa rangee (7, 4 ou 5), avec SOUS la carte les deux lignes
 d'infos (nom + dispo/note, puis livraison) et leurs squelettes.

 Une vue garde toute sa vie le meme design (type de vue = design, reserve de
 cartes commune a toutes les rangees) : la reconfigurer ne change que des
 textes et une image.
 */
class HLMenuCardView(context: Context, val design: Int) : HLBox(context) {
  private val size = HLLayout.card(design)

  // Contenu reel (fondu entrant) et squelettes (fondu sortant).
  val content = HLBox(context)
  val skeletons = HLBox(context)

  private val card = HLBox(context)
  private val image = HLImageView(context)
  private var gradient: HLGradientView? = null
  private val price = HLLabel(context).apply {
    setFont(900, 12f, Color.BLACK)
    background = roundedBackground(Color.WHITE, 12f)
    insets = floatArrayOf(10f, 4f, 10f, 4f)
  }
  private var v7Bottom: HLV7BottomZone? = null
  private var v4Bar: HLStockDeliveryBar? = null
  private var v5Bar: HLV5BottomBar? = null

  // ItemMeta : deux lignes, chacune a gauche + a droite.
  private val titleLabel = HLLabel(context)
  private val titleRight = HLLabel(context)
  private val lineLeft = HLLabel(context)
  private val lineRight = HLLabel(context)

  private val cardSkeleton = HLSkeletonView(context, size.radius)
  private val metaBar1 = View(context).apply { background = roundedBackground(HLColor.skeletonBase, 4f) }
  private val metaBar2 = View(context).apply { background = roundedBackground(HLColor.skeletonBase, 4f) }

  init {
    Companion.created++
    addAll(content, skeletons)
    content.addView(card)
    card.roundCorners(size.radius)
    card.addView(image)
    when (design) {
      4 -> {
        card.setBackgroundColor(HLColor.v4Background)
        v4Bar = HLStockDeliveryBar(context).also { card.addView(it) }
      }
      5 -> {
        val bg = HLGradientView(
          context,
          intArrayOf(HLColor.hex("#fafafa"), HLColor.hex("#f0f0f0"), HLColor.hex("#e8e8e8")),
          start = 0f to 0f, end = 1f to 1f,
        )
        card.addView(bg, 0)
        gradient = bg
        v5Bar = HLV5BottomBar(context).also { card.addView(it) }
      }
      else -> {
        // Triple degrade : haut sombre -> transparent -> bas tres sombre.
        val g = HLGradientView(
          context,
          intArrayOf(HLColor.black(0.6f), HLColor.white(0f), HLColor.black(0f), HLColor.black(0.5f), HLColor.black(0.95f)),
          floatArrayOf(0f, 0.15f, 0.35f, 0.6f, 1f),
        )
        card.addView(g)
        gradient = g
        v7Bottom = HLV7BottomZone(context).also { card.addView(it) }
      }
    }
    card.addView(price)
    content.addAll(titleLabel, titleRight, lineLeft, lineRight)
    skeletons.addAll(cardSkeleton, metaBar1, metaBar2)

    onPlace = { w, h ->
      content.frame(0f, 0f, w, h)
      skeletons.frame(0f, 0f, w, h)
    }
    card.onPlace = { w, h -> placeCard(w, h) }
    content.onPlace = { _, _ -> placeContent() }
    skeletons.onPlace = { _, _ ->
      // Squelettes : carte, puis deux barres (70 % x 12, 50 % x 10).
      cardSkeleton.frame(0f, 0f, size.width, size.height)
      metaBar1.frame(4f, size.height + 10f, size.width * 0.7f, 12f)
      metaBar2.frame(4f, size.height + 28f, size.width * 0.5f, 10f)
    }
  }

  private fun placeCard(w: Float, h: Float) {
    gradient?.frame(0f, 0f, w, h)
    image.frame(0f, 0f, w, h)
    // Photo floutee calee sur la photo de la carte (repere de la barre).
    v4Bar?.let {
      it.blur.photoFrame = floatArrayOf(0f, HLStockDeliveryBar.HEIGHT - h, w, h)
      it.frame(0f, h - HLStockDeliveryBar.HEIGHT, w, HLStockDeliveryBar.HEIGHT)
    }
    v5Bar?.let {
      it.blur.photoFrame = floatArrayOf(0f, HLV5BottomBar.HEIGHT - h, w, h)
      it.frame(0f, h - HLV5BottomBar.HEIGHT, w, HLV5BottomBar.HEIGHT)
    }
    v7Bottom?.frame(0f, h - HLV7BottomZone.HEIGHT, w, HLV7BottomZone.HEIGHT)
    // Pastille prix : 8/8 (variants 7 et 5), 14/14 (variant 4).
    val inset = if (design == 4) 14f else 8f
    price.frame(inset, inset, price.fitWidth(), price.fitHeight())
  }

  private fun placeContent() {
    val w = size.width
    val h = size.height
    card.frame(0f, 0f, w, h)
    // ItemMeta : paddingTop 8, paddingLeft 4, gap 3 ; lignes de 16.
    val metaX = 4f
    val row1Y = h + 8f
    val row2Y = row1Y + 16f + 3f
    // Variant 7 : `marginRight: 6` apres le stock.
    val rightInset = if (design == 7) 6f else 0f
    val trw = titleRight.textWidth()
    val trx = w - rightInset - trw
    titleRight.frame(trx, row1Y, trw, 16f)
    titleLabel.frame(metaX, row1Y, maxOf(0f, trx - 4f - metaX), 16f)
    val lrw = lineRight.textWidth()
    lineRight.frame(w - lrw, row2Y, lrw, 16f)
    lineLeft.frame(metaX, row2Y, maxOf(0f, w - metaX - (if (lrw > 0f) lrw + 4f else 0f)), 16f)
  }

  /**
   `menu == null` : carte d'un fantome, squelette seul.
   `revealed` : etat de la boutique (la carte ne decide jamais seule).
   */
  fun configure(menu: HLMenu?, deliveryTime: String, revealed: Boolean) {
    if (menu == null) {
      HLImage.clear(image)
      v4Bar?.blur?.setPhoto(null, size.width, size.height)
      v5Bar?.blur?.setPhoto(null, size.width, size.height)
      titleLabel.text = null
      titleRight.text = null
      lineLeft.text = null
      lineRight.text = null
      price.text = null
      setRevealed(false)
      return
    }
    HLImage.set(image, menu.image, size.width, size.height)
    // La barre floutee (cartes 4 et 5) reprend la photo, floutee d'avance.
    v4Bar?.blur?.setPhoto(menu.image, size.width, size.height)
    v5Bar?.blur?.setPhoto(menu.image, size.width, size.height)
    price.text = menu.price
    v7Bottom?.configure(deliveryTime, menu.feeLabel)
    v4Bar?.configure(menu.stock, deliveryTime)
    v5Bar?.configure(deliveryTime, menu.feeLabel)
    configureMeta(menu)
    setRevealed(revealed)
    card.relayout()
    content.relayout()
  }

  /** Lignes sous la carte, selon `ItemMeta.tsx` (SHOW_AVAILABILITY = true). */
  private fun configureMeta(m: HLMenu) {
    titleLabel.text = HLRuns().run(m.title, 900, 13f, if (design == 7) Color.BLACK else HLColor.metaTitle).build()
    val orange = HLColor.accent
    when (design) {
      4 -> {
        titleRight.text = HLRuns()
          .icon("star", 12f, HLColor.starYellow).gap(4f)
          .run(m.rating, 700, 11f, Color.BLACK).gap(4f)
          .run("(${m.votes} avis)", 600, 11f, HLColor.metaMuted)
          .build()
        lineLeft.text = HLRuns()
          .run("Livraison ", 700, 11f, HLColor.metaText)
          .run(m.metaFeeLabel, 900, 11f, orange)
          .build()
        lineRight.text = HLRuns()
          .run("Livré en ", 600, 11f, HLColor.v4TimeText)
          .run("15min", 900, 13f, HLColor.metaTitle)
          .build()
      }
      5 -> {
        titleRight.text = HLRuns().run("${m.stock}", 700, 11f, Color.BLACK).build()
        lineLeft.text = HLRuns()
          .run("Livré en ", 700, 11f, HLColor.metaText)
          .run("30min", 900, 11f, orange)
          .build()
        lineRight.text = HLRuns()
          .icon("star", 12f, HLColor.starYellow).gap(4f)
          .run(m.rating, 700, 11f, HLColor.metaText)
          .build()
      }
      else -> {
        titleRight.text = HLRuns().run("${m.stock}", 700, 11f, Color.BLACK).build()
        lineLeft.text = HLRuns()
          .run("Livré en ", 700, 11f, HLColor.metaText)
          .run("30min", 900, 11f, orange)
          .build()
        lineRight.text = null
      }
    }
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

  companion object {
    /** Sonde : cartes creees depuis le lancement. */
    var created = 0
  }
}
