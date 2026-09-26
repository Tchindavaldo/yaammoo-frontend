import UIKit

/**
 Diagnostic TEMPORAIRE : quel element des boutiques du haut coute une image
 au serveur de rendu quand elles entrent a l'ecran pour la premiere fois ?

 Build 60 : aux scrolls 2-3, une image perdue cote ECRAN (fil principal
 fluide) chaque fois qu'une nouvelle rangee entre par le bas (ecart entre
 deux pertes = hauteur d'une rangee), puis plus rien une fois les cellules
 reutilisees. La sonde ne dit pas QUEL calque coute : on retire donc une
 famille d'elements a la fois, une variante par lancement, et on compare les
 pertes par variante (tag Sentry `cellDiag`).

 - `base` : design intact (reference) ;
 - `noclip` : coins arrondis non decoupes (cartes, avatar, squelettes...) ;
 - `notext` : aucun texte (cartes et en-tete) ;
 - `nophoto` : aucune photo (cartes, avatar, photo floutee des barres) ;
 - `nofx` : ni degrades ni fond floute des barres (textes gardes).

 Prop `cellDiag` (JS, donc OTA) : `off` | `rotate` (variante suivante a
 chaque lancement) | nom d'une variante. Actif seulement en TestFlight : un
 reglage oublie dans une OTA ne touche jamais l'App Store.
 */
enum HLCellDiag {
  enum Variant: String, CaseIterable {
    case base, noclip, notext, nophoto, nofx
  }

  /** Variante du lancement, recue au montage avant la creation des cellules. */
  private(set) static var variant: Variant = .base
  private static var decided = false
  private static let nextKey = "yaammoo.homeList.cellDiagNext"

  static func configure(_ mode: String) {
    // Une seule variante par lancement, meme si la vue est remontee.
    guard !decided else { return }
    decided = true
    guard isTestBuild else { return }
    if let fixed = Variant(rawValue: mode) {
      variant = fixed
    } else if mode == "rotate" {
      let all = Variant.allCases
      let i = UserDefaults.standard.integer(forKey: nextKey) % all.count
      variant = all[i]
      UserDefaults.standard.set(i + 1, forKey: nextKey)
    }
  }

  private static var isTestBuild: Bool {
    #if DEBUG
    return true
    #else
    return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
    #endif
  }

  /** Photo floutee des barres 4 et 5 masquee (`HLBlurBar` la repose a chaque mise en page). */
  static var hidesBlurPhoto: Bool { variant == .nophoto || variant == .nofx }
  /** Voile et flou systeme des barres masques. */
  static var hidesBlurVeil: Bool { variant == .nofx }

  /** Applique la variante a une vue et a ses sous-vues, une fois construites. */
  static func apply(_ root: UIView) {
    guard variant != .base else { return }
    walk(root)
  }

  private static func walk(_ v: UIView) {
    switch variant {
    case .base:
      return
    case .noclip:
      // Decoupe rectangulaire (rayon 0) gardee : elle ne coute rien.
      if v.layer.cornerRadius > 0 { v.clipsToBounds = false }
    case .notext:
      if v is UILabel { v.isHidden = true }
    case .nophoto:
      if v is UIImageView { v.isHidden = true }
    case .nofx:
      if v is HLGradientView { v.isHidden = true }
    }
    v.subviews.forEach(walk)
  }
}
