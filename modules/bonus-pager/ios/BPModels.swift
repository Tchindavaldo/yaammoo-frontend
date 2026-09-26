import ExpoModulesCore
import UIKit

// MARK: - Record recu de JS (prop `items`)

/**
 Tout est PRE-CALCULE cote JS (`NativeBonusPager.tsx`) : statut, textes,
 couleur et glyphe d'icone. Le natif ne fait qu'afficher : aucune regle
 metier des bonus n'est dupliquee en Swift.
 */
struct BPItemRecord: Record {
  @Field var id: String = ""
  @Field var color: String = ""
  @Field var icon: String = ""
  @Field var label: String = ""
  @Field var issuer: String = ""
  @Field var remaining: String? = nil
  @Field var name: String = ""
  @Field var statusLabel: String = ""
  @Field var statusColor: String = ""
}

struct BPItem: Equatable {
  let id: String
  let color: UIColor
  let icon: String
  let label: String
  let issuer: String
  let remaining: String?
  let name: String
  let statusLabel: String
  let statusColor: UIColor

  init(_ r: BPItemRecord) {
    id = r.id
    color = BPColor.parse(r.color) ?? BPColor.fallback
    icon = r.icon
    label = r.label
    issuer = r.issuer
    remaining = r.remaining
    name = r.name
    statusLabel = r.statusLabel
    statusColor = BPColor.parse(r.statusColor) ?? BPColor.fallback
  }
}

// MARK: - Couleurs

enum BPColor {
  /** `Theme.colors.primary` : couleur du bonus par defaut. */
  static let fallback = UIColor(red: 0xec / 255, green: 0x49 / 255, blue: 0x13 / 255, alpha: 1)

  /** `#RGB`, `#RRGGBB` ou `#RRGGBBAA`. */
  static func parse(_ s: String) -> UIColor? {
    var hex = s.trimmingCharacters(in: .whitespaces)
    guard hex.hasPrefix("#") else { return nil }
    hex.removeFirst()
    if hex.count == 3 { hex = hex.map { "\($0)\($0)" }.joined() }
    guard hex.count == 6 || hex.count == 8, let v = UInt64(hex, radix: 16) else { return nil }
    let alpha = hex.count == 8
    let r = CGFloat((v >> (alpha ? 24 : 16)) & 0xff) / 255
    let g = CGFloat((v >> (alpha ? 16 : 8)) & 0xff) / 255
    let b = CGFloat((v >> (alpha ? 8 : 0)) & 0xff) / 255
    let a = alpha ? CGFloat(v & 0xff) / 255 : 1
    return UIColor(red: r, green: g, blue: b, alpha: a)
  }
}

/**
 Couleur decomposee, pour les fondus pilotes par la position du scroll :
 meme melange canal par canal que les interpolations de couleur d'`Animated`.
 */
struct BPRGBA {
  var r: CGFloat
  var g: CGFloat
  var b: CGFloat
  var a: CGFloat

  init(r: CGFloat, g: CGFloat, b: CGFloat, a: CGFloat) {
    self.r = r
    self.g = g
    self.b = b
    self.a = a
  }

  /** `alpha` remplace l'opacite de la couleur (`${color}1f` cote RN). */
  init(_ color: UIColor, alpha: CGFloat? = nil) {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    color.getRed(&r, green: &g, blue: &b, alpha: &a)
    self.init(r: r, g: g, b: b, a: alpha ?? a)
  }

  static func black(_ alpha: CGFloat) -> BPRGBA { BPRGBA(r: 0, g: 0, b: 0, a: alpha) }

  var color: UIColor { UIColor(red: r, green: g, blue: b, alpha: a) }

  /** `t = 0` → self, `t = 1` → `other`. */
  func mix(_ other: BPRGBA, _ t: CGFloat) -> UIColor {
    UIColor(red: r + (other.r - r) * t, green: g + (other.g - g) * t,
            blue: b + (other.b - b) * t, alpha: a + (other.a - a) * t)
  }
}
