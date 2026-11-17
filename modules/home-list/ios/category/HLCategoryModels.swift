import ExpoModulesCore
import UIKit

// MARK: - Records recus de JS (`NativeCategoryList.tsx`)

/**
 Liste native des tabs CATEGORIE du home (Poulet, Burger, Pizza, Autre),
 SEPAREE de la liste « Tout » (`HomeListView`) : propres records, propre etat,
 propres cellules (R16). Seuls les utilitaires sans etat sont partages
 (`HLImage`, `HLSkeletonView`, `HLPill`, `HLText`, couleurs, polices).

 Tout est PRE-CALCULE cote JS : prix formate, libelles du design aere (stock,
 jauge, frais, delai), image de secours resolue en URL.
 */
struct HLCDishRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var image: String? = nil
  /** Image locale de secours (asset RN resolu en URL) quand `image` est nulle. */
  @Field var fallbackImage: String? = nil
  @Field var price: String = ""
  @Field var rating: String = ""
  @Field var votes: Int = 0
  @Field var stockValue: String = ""
  @Field var stockUnit: String = ""
  @Field var stockLow: Bool = false
  @Field var stockRatio: Double = 0
  @Field var feeText: String = ""
  @Field var feeFree: Bool = false
  @Field var eta: String = ""
}

/** Une rangee de la grille : N plats (de boutiques differentes) cote a cote. */
struct HLCRowRecord: Record {
  @Field var id: String = ""
  @Field var dishes: [HLCDishRecord] = []
}

struct HLCBannerRecord: Record {
  @Field var id: String = ""
  @Field var imageUrl: String = ""
  @Field var title: String? = nil
  @Field var tappable: Bool = false
}

/**
 Mise a jour PARTIELLE (fonction `updateRows`) : rangees a partir de `start`,
 liste ramenee a `total`. `feedKey` change = autre tab (ou autre ville, autre
 compte) : la liste repart a zero (squelettes, banniere comprise, attente avant
 le fondu, haut de liste).
 */
struct HLCUpdateRecord: Record {
  @Field var feedKey: String = ""
  @Field var start: Int = 0
  @Field var rows: [HLCRowRecord] = []
  @Field var total: Int = 0
  @Field var hasMore: Bool = false
  @Field var ghostCount: Int = 0
  @Field var footerText: String? = nil
  @Field var footerIsEmpty: Bool = false
  /** Premiere page en cours : squelettes a la place des rangees. */
  @Field var loading: Bool = false
}

// MARK: - Modeles internes (comparables)

struct HLCDish: Equatable {
  let id: String
  let title: String
  let image: String?
  let price: String
  let rating: String
  let votes: Int
  let stockValue: String
  let stockUnit: String
  let stockLow: Bool
  let stockRatio: CGFloat
  let feeText: String
  let feeFree: Bool
  let eta: String

  init(_ r: HLCDishRecord) {
    id = r.id
    title = r.title
    image = r.image ?? r.fallbackImage
    price = r.price
    rating = r.rating
    votes = r.votes
    stockValue = r.stockValue
    stockUnit = r.stockUnit
    stockLow = r.stockLow
    stockRatio = CGFloat(min(max(r.stockRatio, 0), 1))
    feeText = r.feeText
    feeFree = r.feeFree
    eta = r.eta
  }
}

struct HLCRow: Equatable {
  let id: String
  let dishes: [HLCDish]

  init(_ r: HLCRowRecord) {
    id = r.id
    dishes = r.dishes.map(HLCDish.init)
  }
}

struct HLCBanner: Equatable {
  let id: String
  let imageUrl: String
  let title: String?
  let tappable: Bool

  init(_ r: HLCBannerRecord) {
    id = r.id
    imageUrl = r.imageUrl
    title = r.title
    tappable = r.tappable
  }
}

/** Contenu d'une rangee : vrais plats, ou fantome (squelette). */
enum HLCRowContent: Equatable {
  case dishes(HLCRow)
  case ghost
}

// MARK: - Cotes

/**
 Cotes de la liste categorie. Reprises de la grille d'origine (`HLGrid`) :
 cartes V7 aerees 150 x 190, lignes d'infos de 44 sous la carte.
 */
enum HLCLayout {
  /** `Theme.design.horizontalPadding` (prop `sidePadding` de CETTE liste). */
  static var sidePadding: CGFloat = 4
  static let card = HLCardSize(width: 150, height: 190, radius: 12)
  static let cardGap: CGFloat = 8
  static let rowTop: CGFloat = 4
  static let rowBottom: CGFloat = 20
  /** ItemMeta : paddingTop 8 + titre 16 + gap 3 + ligne 16 (+ 1 de marge). */
  static let metaHeight: CGFloat = 44
  static var rowHeight: CGFloat { rowTop + card.height + metaHeight + rowBottom }
  /** Cartes squelettes d'un fantome. */
  static let ghostCards = 3

  static let bannerTop: CGFloat = 4
  static let bannerSlideHeight: CGFloat = 210
  static let bannerBottom: CGFloat = 30
  static var bannerHeight: CGFloat { bannerTop + bannerSlideHeight + bannerBottom }

  /** Fondu squelette -> contenu. */
  static let revealDuration: TimeInterval = 0.22
  /**
   Apres un changement de tab, squelettes (banniere comprise) gardes ce temps
   une fois le premier ecran pret, a CHAQUE bascule : pas de flash.
   */
  static let revealHold: TimeInterval = 0.5
  /** Revelation forcee si une image ne repond jamais. */
  static let revealMaxWait: TimeInterval = 8
}
