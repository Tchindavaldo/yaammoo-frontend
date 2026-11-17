package com.rauval.yaammoo.homelist.category

import com.rauval.yaammoo.homelist.HLCardSize
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Liste native des tabs CATEGORIE du home (Poulet, Burger, Pizza, Autre),
// SEPAREE de la liste « Tout » (`HomeListView`) : propres records, propre etat,
// propres vues (R16). Seuls les utilitaires sans etat sont partages (`HLImage`,
// `HLBox`, `HLLabel`, `HLSkeletonView`, `HLRuns`, couleurs, polices).
// Memes champs que `HLCategoryModels.swift`. Tout est PRE-CALCULE cote JS.

class HLCDishRecord : Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var image: String? = null
  /** Image locale de secours (asset RN resolu) quand `image` est nulle. */
  @Field var fallbackImage: String? = null
  @Field var price: String = ""
  @Field var rating: String = ""
  @Field var votes: Int = 0
  @Field var stockValue: String = ""
  @Field var stockUnit: String = ""
  @Field var stockLow: Boolean = false
  @Field var stockRatio: Double = 0.0
  @Field var feeText: String = ""
  @Field var feeFree: Boolean = false
  @Field var eta: String = ""
}

/** Une rangee de la grille : N plats (de boutiques differentes) cote a cote. */
class HLCRowRecord : Record {
  @Field var id: String = ""
  @Field var dishes: List<HLCDishRecord> = emptyList()
}

class HLCBannerRecord : Record {
  @Field var id: String = ""
  @Field var imageUrl: String = ""
  @Field var title: String? = null
  @Field var tappable: Boolean = false
}

/**
 Mise a jour PARTIELLE (`updateRows`). `feedKey` change = autre tab (ou autre
 ville, autre compte) : la liste repart a zero (squelettes, banniere comprise,
 attente avant le fondu, haut de liste).
 */
class HLCUpdateRecord : Record {
  @Field var feedKey: String = ""
  @Field var start: Int = 0
  @Field var rows: List<HLCRowRecord> = emptyList()
  @Field var total: Int = 0
  @Field var hasMore: Boolean = false
  @Field var ghostCount: Int = 0
  @Field var footerText: String? = null
  @Field var footerIsEmpty: Boolean = false
  /** Premiere page en cours : squelettes a la place des rangees. */
  @Field var loading: Boolean = false
}

// Modeles internes : egalite structurelle, pour ne reconfigurer que le necessaire.

data class HLCDish(
  val id: String,
  val title: String,
  val image: String?,
  val price: String,
  val rating: String,
  val votes: Int,
  val stockValue: String,
  val stockUnit: String,
  val stockLow: Boolean,
  val stockRatio: Float,
  val feeText: String,
  val feeFree: Boolean,
  val eta: String,
) {
  constructor(r: HLCDishRecord) : this(
    r.id, r.title, r.image ?: r.fallbackImage, r.price, r.rating, r.votes,
    r.stockValue, r.stockUnit, r.stockLow, r.stockRatio.toFloat().coerceIn(0f, 1f),
    r.feeText, r.feeFree, r.eta,
  )
}

data class HLCRow(val id: String, val dishes: List<HLCDish>) {
  constructor(r: HLCRowRecord) : this(r.id, r.dishes.map { HLCDish(it) })
}

data class HLCBanner(val id: String, val imageUrl: String, val title: String?, val tappable: Boolean) {
  constructor(r: HLCBannerRecord) : this(r.id, r.imageUrl, r.title, r.tappable)
}

/** Contenu d'une rangee : vrais plats, ou fantome (squelette). */
sealed class HLCRowContent {
  data class Dishes(val row: HLCRow) : HLCRowContent()
  object Ghost : HLCRowContent()
}

/** `updateRows` decode hors du fil de l'ecran, pret a poser. */
class HLCUpdate(
  val feedKey: String,
  val start: Int,
  val rows: List<HLCRow>,
  val total: Int,
  val hasMore: Boolean,
  val ghostCount: Int,
  val footerText: String?,
  val footerIsEmpty: Boolean,
  val loading: Boolean,
) {
  constructor(r: HLCUpdateRecord) : this(
    r.feedKey, r.start, r.rows.map { HLCRow(it) }, r.total, r.hasMore, r.ghostCount,
    r.footerText, r.footerIsEmpty, r.loading,
  )
}

/**
 Cotes de la liste categorie (dp), reprises de la grille d'origine (`HL_GRID`) :
 cartes V7 aerees 150 x 190, lignes d'infos de 44 sous la carte.
 */
object HLCLayout {
  /** `Theme.design.horizontalPadding` (prop `sidePadding` de CETTE liste). */
  var sidePadding = 4f
  val card = HLCardSize(150f, 190f, 12f)
  const val cardGap = 8f
  const val rowTop = 4f
  const val rowBottom = 20f
  /** ItemMeta : paddingTop 8 + titre 16 + gap 3 + ligne 16 (+ 1 de marge). */
  const val metaHeight = 44f
  val rowHeight: Float get() = rowTop + card.height + metaHeight + rowBottom
  /** Cartes squelettes d'un fantome. */
  const val ghostCards = 3

  const val bannerTop = 4f
  const val bannerSlideHeight = 210f
  const val bannerBottom = 30f
  const val bannerHeight = bannerTop + bannerSlideHeight + bannerBottom

  /** Fondu squelette -> contenu. */
  const val revealMs = 220L
  /**
   Apres un changement de tab, squelettes (banniere comprise) gardes ce temps
   une fois le premier ecran pret, a CHAQUE bascule : pas de flash.
   */
  const val revealHoldMs = 500L
  /** Revelation forcee si une image ne repond jamais. */
  const val revealMaxWaitMs = 8000L
}
