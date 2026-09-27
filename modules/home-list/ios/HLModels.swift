import ExpoModulesCore

// MARK: - Records recus de JS (props `rows`, `banners`, `icons`)

/**
 Tout est PRE-CALCULE cote JS (`NativeHomeList.tsx`) : prix formate, heure de
 prochaine livraison, frais, images de secours resolues en URL. Le natif ne
 fait qu'afficher : aucune regle metier n'est dupliquee en Swift.
 */
struct HLMenuRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var image: String? = nil
  /** Image locale de secours (asset RN resolu en URL) quand `image` est nulle. */
  @Field var fallbackImage: String? = nil
  @Field var price: String = ""
  @Field var stock: Int = 0
  @Field var rating: String = "4.5"
  @Field var votes: Int = 0
  /** « gratuit », « 300F », « 1000F » (`deliveryFeeLabelFor`). */
  @Field var feeLabel: String = ""
  /** « gratuite », « 300F », « 1000F » (ligne livraison du variant 4). */
  @Field var metaFeeLabel: String = ""
}

struct HLShopRecord: Record {
  @Field var id: String = ""
  @Field var design: Int = 7
  @Field var name: String = ""
  @Field var avatar: String? = nil
  @Field var avatarFallback: String? = nil
  @Field var orders: Int = 0
  @Field var votes: Int = 0
  @Field var deliveryTime: String = ""
  @Field var menus: [HLMenuRecord] = []
}

struct HLBannerRecord: Record {
  @Field var id: String = ""
  @Field var imageUrl: String = ""
  @Field var title: String? = nil
  @Field var tappable: Bool = false
}

/**
 Mise a jour de la liste (fonction `updateRows`) : seules les rangees a partir
 de `start` sont transmises, jamais toute la liste. Les rangees `< start` sont
 inchangees ; la liste est ramenee a `total`. L'etat de fin de liste voyage
 dans le MEME appel que les rangees : fantomes et pied de liste ne peuvent pas
 changer une frame avant les boutiques qu'ils encadrent.
 */
struct HLRowsUpdateRecord: Record {
  @Field var start: Int = 0
  @Field var rows: [HLShopRecord] = []
  @Field var total: Int = 0
  @Field var hasMore: Bool = false
  @Field var ghostCount: Int = 0
  @Field var footerText: String? = nil
  @Field var footerIsEmpty: Bool = false
  /** Premiere page en cours : squelettes a la place des boutiques. */
  @Field var loading: Bool = false
}

/** Glyphes Ionicons (police deja chargee par l'app) : `name -> caractere`. */
struct HLIconsRecord: Record {
  @Field var fontFamily: String? = nil
  @Field var glyphs: [String: String] = [:]
}

/** Polices par graisse (noms PostScript), `nil` = police systeme. */
struct HLFontsRecord: Record {
  @Field var w600: String? = nil
  @Field var w700: String? = nil
  @Field var w800: String? = nil
  @Field var w900: String? = nil
}

// MARK: - Modeles internes (comparables, pour ne reconfigurer que le necessaire)

struct HLMenu: Equatable {
  let id: String
  let title: String
  let image: String?
  let price: String
  let stock: Int
  let rating: String
  let votes: Int
  let feeLabel: String
  let metaFeeLabel: String

  init(_ r: HLMenuRecord) {
    id = r.id
    title = r.title
    image = r.image ?? r.fallbackImage
    price = r.price
    stock = r.stock
    rating = r.rating
    votes = r.votes
    feeLabel = r.feeLabel
    metaFeeLabel = r.metaFeeLabel
  }
}

struct HLShop: Equatable {
  let id: String
  let design: Int
  let name: String
  let avatar: String?
  let orders: Int
  let votes: Int
  let deliveryTime: String
  let menus: [HLMenu]

  init(_ r: HLShopRecord) {
    id = r.id
    design = HLLayout.designCycle.contains(r.design) ? r.design : 7
    name = r.name
    avatar = r.avatar ?? r.avatarFallback
    orders = r.orders
    votes = r.votes
    deliveryTime = r.deliveryTime
    menus = r.menus.map(HLMenu.init)
  }
}

struct HLBanner: Equatable {
  let id: String
  let imageUrl: String
  let title: String?
  let tappable: Bool

  init(_ r: HLBannerRecord) {
    id = r.id
    imageUrl = r.imageUrl
    title = r.title
    tappable = r.tappable
  }
}

/** Contenu d'une rangee : vraie boutique, ou fantome (squelette) de la page suivante. */
enum HLRowContent: Equatable {
  case shop(HLShop)
  case ghost(design: Int)

  var design: Int {
    switch self {
    case .shop(let s): return s.design
    case .ghost(let d): return d
    }
  }
}

/** Nombre de cartes squelettes d'un fantome (`PLACEHOLDER_MENUS`). */
let HLGhostMenuCount = 3
