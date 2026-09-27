package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewOutlineProvider

/**
 En-tete d'une rangee boutique (`MerchantHeader.tsx`, `HLMerchantHeaderView.swift`) :
 avatar 32, nom + « Ouvert », puis a droite les chips commandes/avis au-dessus
 de 5 etoiles.

 Contenu reel et squelette superposes ; la revelation ne joue que sur leurs
 opacites (pilotees par la rangee, dans la meme animation que les cartes).
 */
class HLMerchantHeaderView(context: Context) : HLBox(context) {
  val content = HLBox(context)
  val skeleton = HLBox(context)

  val avatar = HLImageView(context)
  private val avatarRing = View(context)
  private val nameLabel = HLLabel(context)
  private val statusDot = View(context)
  private val statusLabel = HLLabel(context)
  private val ordersChip = HLLabel(context)
  private val votesChip = HLLabel(context)
  private val starsLabel = HLLabel(context)

  private val avatarSkeleton = HLSkeletonView(context, 16f)
  private val nameSkeleton = HLSkeletonView(context, 6f)
  private val ratingSkeleton = HLSkeletonView(context, 6f)

  init {
    setBackgroundColor(Color.WHITE)
    addAll(content, skeleton)

    avatar.outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) = outline.setOval(0, 0, view.width, view.height)
    }
    avatar.clipToOutline = true
    // Anneau par-dessus l'avatar (bordure 1, #F2F2F7), comme le `border` iOS.
    avatarRing.background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setStroke(maxOf(1, 1.px()), HLColor.gray100)
    }

    nameLabel.setFont(700, 14f, HLColor.dark)
    statusDot.background = roundedBackground(HLColor.green, 3f)
    statusLabel.setFont(800, 10f, HLColor.green)
    statusLabel.text = "Ouvert"
    for (chip in listOf(ordersChip, votesChip)) {
      chip.background = roundedBackground(HLColor.chip, 8f)
      chip.insets = floatArrayOf(5f, 2f, 5f, 2f)
    }
    content.addAll(avatar, avatarRing, nameLabel, statusDot, statusLabel, ordersChip, votesChip, starsLabel)
    skeleton.addAll(avatarSkeleton, nameSkeleton, ratingSkeleton)

    onPlace = { w, h ->
      content.frame(0f, 0f, w, h)
      skeleton.frame(0f, 0f, w, h)
    }
    content.onPlace = { w, h -> placeContent(w, h) }
    skeleton.onPlace = { w, h ->
      val cy = h / 2f
      // Memes emplacements : avatar, nom 110x14, note 82x14.
      avatarSkeleton.frame(0f, cy - 16f, 32f, 32f)
      nameSkeleton.frame(40f, cy - 7f, 110f, 14f)
      ratingSkeleton.frame(w - 82f, cy - 7f, 82f, 14f)
    }
  }

  private fun placeContent(w: Float, h: Float) {
    val cy = h / 2f
    // Gauche : avatar + nom / statut (gap 8).
    avatar.frame(0f, cy - 16f, 32f, 32f)
    avatarRing.frame(0f, cy - 16f, 32f, 32f)
    val nameH = nameLabel.lineHeight()
    val statusH = 12f
    val blockTop = cy - (nameH + 1f + statusH) / 2f
    nameLabel.frame(40f, blockTop, minOf(120f, nameLabel.textWidth()), nameH)
    statusDot.frame(40f, blockTop + nameH + 1f + (statusH - 6f) / 2f, 6f, 6f)
    statusLabel.frame(50f, blockTop + nameH + 1f, statusLabel.textWidth(), statusH)

    // Droite : chips (paddingH 5, paddingV 2, gap 4) puis etoiles (gap 3).
    val chipH = 18f
    val starsH = 17f
    val rightTop = cy - (chipH + 3f + starsH) / 2f
    var x = w
    for (chip in listOf(votesChip, ordersChip)) {
      val cw = chip.fitWidth()
      x -= cw
      chip.frame(x, rightTop, cw, chipH)
      x -= 4f
    }
    val starsW = starsLabel.textWidth()
    starsLabel.frame(w - starsW, rightTop + chipH + 3f, starsW, starsH)
  }

  /** `null` = fantome : seul le squelette a un sens. */
  fun configure(shop: HLShop?) {
    if (shop == null) {
      nameLabel.text = null
      ordersChip.text = null
      votesChip.text = null
      starsLabel.text = null
      HLImage.clear(avatar)
      content.relayout()
      return
    }
    nameLabel.text = shop.name
    ordersChip.text = chipText("receipt-outline", "${shop.orders}")
    votesChip.text = chipText("people-outline", "${shop.votes}")
    // Les 5 etoiles sont pleines dans l'original (#e8440a), `gap: 2`.
    val stars = HLRuns()
    for (i in 0 until 5) {
      stars.icon("star", 14f, HLColor.accent)
      if (i < 4) stars.gap(2f)
    }
    starsLabel.text = stars.build()
    content.relayout()
  }

  private fun chipText(icon: String, value: String): CharSequence =
    HLRuns().icon(icon, 11f, Color.BLACK).gap(3f).run(value, 700, 10f, HLColor.chipText).build()

  fun setSkeletonBreathing(on: Boolean) {
    avatarSkeleton.setBreathing(on)
    nameSkeleton.setBreathing(on)
    ratingSkeleton.setBreathing(on)
  }

  companion object {
    const val AVATAR = 32f
  }
}
