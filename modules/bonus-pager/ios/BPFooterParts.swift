import UIKit

// MARK: - Icone

/** Icone Ionicons (police deja chargee par l'app), repli SF Symbol sinon. */
final class BPIconView: UIView {
  private let label = UILabel()
  private let image = UIImageView()
  var color: UIColor = .black {
    didSet {
      label.textColor = color
      image.tintColor = color
    }
  }

  init(glyph: String, size: CGFloat, fontFamily: String?) {
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    label.textAlignment = .center
    image.contentMode = .center
    if !glyph.isEmpty, let font = BPIconView.font(fontFamily, size) {
      label.font = font
      label.text = glyph
      addSubview(label)
    } else {
      let config = UIImage.SymbolConfiguration(pointSize: size * 0.85, weight: .semibold)
      image.image = UIImage(systemName: "gift.fill", withConfiguration: config)
      addSubview(image)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  override func layoutSubviews() {
    super.layoutSubviews()
    label.frame = bounds
    image.frame = bounds
  }

  private static func font(_ family: String?, _ size: CGFloat) -> UIFont? {
    for name in [family, "Ionicons", "ionicons"].compactMap({ $0 }) {
      if let f = UIFont(name: name, size: size) { return f }
    }
    return nil
  }
}

// MARK: - Mini-carte de la galerie (`BonusGalleryCard`)

/**
 Fond, badge d'icone, barre de progression et couleur d'icone suivent
 `focus` (1 = carte centree, 0 = a une carte ou plus). La graisse du libelle
 bascule a mi-chemin, comme `active` cote RN.
 */
final class BPGalleryCard: UIView {
  static let width: CGFloat = 72
  /** paddingVertical 8 + icone 26 + gap 5 + libelle 15 + gap 5 + barre 4 + 8. */
  static let height: CGFloat = 71

  private let iconBox = UIView()
  private let icon: BPIconView
  private let label = UILabel()
  private let bar = UIView()
  private let fill = UIView()
  private let activeTextColor: UIColor
  private var focus: CGFloat = -1
  private var active: Bool?

  // Repos (hors centre) → pleine lumiere (carte centree).
  private let restBg = BPRGBA.black(0.04)
  private let fullBg: BPRGBA
  private let restIconBg = BPRGBA.black(0.06)
  private let fullIconBg: BPRGBA
  private let neutral = BPRGBA.black(0.35)
  private let full: BPRGBA

  init(item: BPItem, activeTextColor: UIColor, iconFontFamily: String?) {
    full = BPRGBA(item.color)
    fullBg = BPRGBA(item.color, alpha: CGFloat(0x12) / 255)
    fullIconBg = BPRGBA(item.color, alpha: CGFloat(0x1f) / 255)
    icon = BPIconView(glyph: item.icon, size: 15, fontFamily: iconFontFamily)
    self.activeTextColor = activeTextColor
    super.init(frame: .zero)
    layer.cornerRadius = 14
    layer.cornerCurve = .continuous
    iconBox.layer.cornerRadius = 8
    iconBox.addSubview(icon)
    addSubview(iconBox)
    label.text = item.label
    addSubview(label)
    bar.backgroundColor = UIColor(white: 0, alpha: 0.08)
    bar.layer.cornerRadius = 2
    bar.clipsToBounds = true
    fill.layer.cornerRadius = 2
    bar.addSubview(fill)
    addSubview(bar)
    apply(focus: 0, active: false)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  override func layoutSubviews() {
    super.layoutSubviews()
    // paddingHorizontal 10, paddingVertical 8, gap 5.
    iconBox.frame = CGRect(x: 10, y: 8, width: 26, height: 26)
    icon.frame = iconBox.bounds
    label.frame = CGRect(x: 10, y: 39, width: bounds.width - 20, height: 15)
    bar.frame = CGRect(x: 10, y: 59, width: bounds.width - 20, height: 4)
    layoutFill()
  }

  /** Barre : 34 % au repos, 100 % au centre. */
  private func layoutFill() {
    let ratio = 0.34 + 0.66 * max(0, focus)
    fill.frame = CGRect(x: 0, y: 0, width: bar.bounds.width * ratio, height: bar.bounds.height)
  }

  func apply(focus f: CGFloat, active a: Bool) {
    if f != focus {
      focus = f
      backgroundColor = restBg.mix(fullBg, f)
      iconBox.backgroundColor = restIconBg.mix(fullIconBg, f)
      let tint = neutral.mix(full, f)
      fill.backgroundColor = tint
      icon.color = tint
      layoutFill()
    }
    if a != active {
      active = a
      label.font = .systemFont(ofSize: 12, weight: a ? .heavy : .bold)
      label.textColor = a ? activeTextColor : UIColor(white: 0, alpha: 0.7)
    }
  }
}
