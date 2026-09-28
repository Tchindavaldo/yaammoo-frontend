package com.rauval.yaammoo.homelist

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Records recus de JS. Tout est PRE-CALCULE cote JS (`NativeHomeList.tsx`) :
// prix formate, heure de prochaine livraison, frais, images de secours
// resolues en URL. Le natif ne fait qu'afficher (memes champs que `HLModels.swift`).

class HLMenuRecord : Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var image: String? = null
  /** Image locale de secours (asset RN resolu) quand `image` est nulle. */
  @Field var fallbackImage: String? = null
  @Field var price: String = ""
  @Field var stock: Int = 0
  @Field var rating: String = "4.5"
  @Field var votes: Int = 0
  /** « gratuit », « 300F », « 1000F » (`deliveryFeeLabelFor`). */
  @Field var feeLabel: String = ""
  /** « gratuite », « 300F », « 1000F » (ligne livraison du variant 4). */
  @Field var metaFeeLabel: String = ""
}

class HLShopRecord : Record {
  @Field var id: String = ""
  @Field var design: Int = 7
  @Field var name: String = ""
  @Field var avatar: String? = null
  @Field var avatarFallback: String? = null
  @Field var orders: Int = 0
  @Field var votes: Int = 0
  @Field var deliveryTime: String = ""
  /** Distance formatee (« 1,2 km ») apres « Ouvert » ; "" = rien. */
  @Field var distance: String = ""
  @Field var menus: List<HLMenuRecord> = emptyList()
}

class HLBannerRecord : Record {
  @Field var id: String = ""
  @Field var imageUrl: String = ""
  @Field var title: String? = null
  @Field var tappable: Boolean = false
}

/**
 Mise a jour de la liste (fonction `updateRows`) : seules les rangees a partir
 de `start` sont transmises. L'etat de fin de liste voyage dans le MEME appel
 que les rangees qu'il encadre.
 */
class HLRowsUpdateRecord : Record {
  @Field var start: Int = 0
  @Field var rows: List<HLShopRecord> = emptyList()
  @Field var total: Int = 0
  @Field var hasMore: Boolean = false
  @Field var ghostCount: Int = 0
  @Field var footerText: String? = null
  @Field var footerIsEmpty: Boolean = false
  /** Premiere page en cours : squelettes a la place des boutiques. */
  @Field var loading: Boolean = false
}

/** Glyphes Ionicons (police deja chargee par l'app) : `name -> caractere`. */
class HLIconsRecord : Record {
  @Field var fontFamily: String? = null
  @Field var glyphs: Map<String, String> = emptyMap()
}

/** Polices par graisse, `null` = police systeme. */
class HLFontsRecord : Record {
  @Field var w600: String? = null
  @Field var w700: String? = null
  @Field var w800: String? = null
  @Field var w900: String? = null
}

// Modeles internes : comparables (egalite structurelle), pour ne reconfigurer
// que ce qui a change.

data class HLMenu(
  val id: String,
  val title: String,
  val image: String?,
  val price: String,
  val stock: Int,
  val rating: String,
  val votes: Int,
  val feeLabel: String,
  val metaFeeLabel: String,
) {
  constructor(r: HLMenuRecord) : this(
    r.id, r.title, r.image ?: r.fallbackImage, r.price, r.stock, r.rating, r.votes,
    r.feeLabel, r.metaFeeLabel,
  )
}

data class HLShop(
  val id: String,
  val design: Int,
  val name: String,
  val avatar: String?,
  val orders: Int,
  val votes: Int,
  val deliveryTime: String,
  val distance: String,
  val menus: List<HLMenu>,
) {
  constructor(r: HLShopRecord) : this(
    r.id,
    if (HLLayout.designCycle.contains(r.design)) r.design else 7,
    r.name,
    r.avatar ?: r.avatarFallback,
    r.orders,
    r.votes,
    r.deliveryTime,
    r.distance,
    r.menus.map { HLMenu(it) },
  )
}

data class HLBanner(val id: String, val imageUrl: String, val title: String?, val tappable: Boolean) {
  constructor(r: HLBannerRecord) : this(r.id, r.imageUrl, r.title, r.tappable)
}

/** Contenu d'une rangee : vraie boutique, ou fantome (squelette) de la page suivante. */
sealed class HLRowContent {
  abstract val design: Int

  data class Shop(val shop: HLShop) : HLRowContent() {
    override val design: Int get() = shop.design
  }

  data class Ghost(override val design: Int) : HLRowContent()
}

/** `updateRows` decode hors du fil de l'ecran, pret a poser. */
class HLRowsUpdate(
  val start: Int,
  val rows: List<HLShop>,
  val total: Int,
  val hasMore: Boolean,
  val ghostCount: Int,
  val footerText: String?,
  val footerIsEmpty: Boolean,
  val loading: Boolean,
) {
  constructor(r: HLRowsUpdateRecord) : this(
    r.start, r.rows.map { HLShop(it) }, r.total, r.hasMore, r.ghostCount, r.footerText,
    r.footerIsEmpty, r.loading,
  )
}
