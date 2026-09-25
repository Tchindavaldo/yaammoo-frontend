import UIKit

/**
 Constantes visuelles de la liste native du home.

 Chaque valeur est reprise TELLE QUELLE des styles React Native d'origine
 (`designs/item/*`, `MerchantHeader`, `HeroBanner`, `src/theme`) : le rendu
 natif doit etre identique au pixel pres. Modifier ici = modifier le design.
 */
enum HLColor {
  static func hex(_ value: String) -> UIColor {
    var s = value.trimmingCharacters(in: .whitespaces)
    if s.hasPrefix("#") { s.removeFirst() }
    var n: UInt64 = 0
    Scanner(string: s).scanHexInt64(&n)
    if s.count == 8 {
      return UIColor(
        red: CGFloat((n >> 24) & 0xff) / 255,
        green: CGFloat((n >> 16) & 0xff) / 255,
        blue: CGFloat((n >> 8) & 0xff) / 255,
        alpha: CGFloat(n & 0xff) / 255
      )
    }
    return UIColor(
      red: CGFloat((n >> 16) & 0xff) / 255,
      green: CGFloat((n >> 8) & 0xff) / 255,
      blue: CGFloat(n & 0xff) / 255,
      alpha: 1
    )
  }

  static func rgba(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat) -> UIColor {
    UIColor(red: r / 255, green: g / 255, blue: b / 255, alpha: a)
  }

  static let accent = hex("#e8440a")
  /** `Theme.colors.primary` (puces actives, rafraichissement). */
  static let primary = hex("#ec4913")
  static let dark = hex("#1C1C1E")
  static let gray100 = hex("#F2F2F7")
  static let green = hex("#00b894")
  static let starYellow = hex("#f5a623")
  static let skeletonBase = hex("#e6eaef")
  static let skeletonHighlight = hex("#f4f7fa")
  static let bannerBackground = hex("#eef1f5")
  static let dot = hex("#d8d2ce")
  static let chip = hex("#f2f2f2")
  static let chipText = hex("#555555")
  static let metaText = hex("#444444")
  static let metaMuted = hex("#999999")
  static let metaTitle = hex("#111111")
  static let v4Background = hex("#fdeded")
  static let v4TimeText = hex("#8a8a8a")
  static let deliveryLabel = hex("#000000e1")
}

/** Graisses RN → UIKit : 900 black, 800 heavy, 700/bold bold, 600 semibold. */
enum HLFont {
  static func w900(_ size: CGFloat) -> UIFont { .systemFont(ofSize: size, weight: .black) }
  static func w800(_ size: CGFloat) -> UIFont { .systemFont(ofSize: size, weight: .heavy) }
  static func w700(_ size: CGFloat) -> UIFont { .systemFont(ofSize: size, weight: .bold) }
  static func w600(_ size: CGFloat) -> UIFont { .systemFont(ofSize: size, weight: .semibold) }
}

/** Gabarit d'une carte menu, par variante de design (cf. `SKELETON_SIZES`). */
struct HLCardSize {
  let width: CGFloat
  let height: CGFloat
  let radius: CGFloat
}

enum HLLayout {
  /** Cycle des designs de rangee (`utils/designCycle.ts`). */
  static let designCycle = [7, 4, 5]

  static func design(forPosition position: Int) -> Int {
    designCycle[((position % 6) + 6) % 6 % designCycle.count]
  }

  static func card(_ design: Int) -> HLCardSize {
    switch design {
    case 4: return HLCardSize(width: 240, height: 240, radius: 16)
    case 5: return HLCardSize(width: 200, height: 250, radius: 16)
    default: return HLCardSize(width: 150, height: 190, radius: 12)
    }
  }

  /** Ecart entre deux cartes (`marginRight: 8`). */
  static let cardGap: CGFloat = 8
  /** `Theme.design.horizontalPadding` : marge laterale de la liste. */
  static var sidePadding: CGFloat = 4

  /** `marginVertical: Theme.spacing.xs` en haut de rangee. */
  static let rowTop: CGFloat = 4
  /** `marginBottom: Theme.design.marginBottom` sous la rangee. */
  static let rowBottom: CGFloat = 20
  /** MerchantHeader : paddingVertical 4 + contenu 38 + paddingVertical 4. */
  static let headerHeight: CGFloat = 46
  /** `marginBottom: 2` sous le header. */
  static let headerGap: CGFloat = 2
  /** ItemMeta : paddingTop 8 + titre 16 + gap 3 + ligne 16 (+ 1 de marge). */
  static let metaHeight: CGFloat = 44

  static func rowHeight(_ design: Int) -> CGFloat {
    rowTop + headerHeight + headerGap + card(design).height + metaHeight + rowBottom
  }

  /** Banniere : marginTop 4 + diapo 210 + marginBottom 30 (puces dedans). */
  static let bannerTop: CGFloat = 4
  static let bannerSlideHeight: CGFloat = 210
  static let bannerBottom: CGFloat = 30
  static var bannerHeight: CGFloat { bannerTop + bannerSlideHeight + bannerBottom }

  /** Fondu squelette → contenu (`REVEAL_MS`). */
  static let revealDuration: TimeInterval = 0.22
  /** Revelation forcee si une image ne repond jamais (`MAX_WAIT_MS`). */
  static let revealMaxWait: TimeInterval = 8
}
