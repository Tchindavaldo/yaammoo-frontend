import UIKit

/**
 Design aere des cartes 4 / 5 / 7 (`homeDesign = "aere"`), repris de
 `designs/item/aere/` (CardV4Aere, CardV5Aere, CardV7Aere) :
 - 4 : degrade sombre, stock en 10 segments en bas ;
 - 5 : barre blanche flottante (stock + jauge) ;
 - 7 : degrade sombre, stock + jauge en bas.
 Libelles (stock, frais, delai) deja calcules en JS (`aere/labels.ts`).
 */
enum HLDesign {
  /** Prop `homeDesign`, recue au montage avant la creation des cellules. */
  static var aere = false
}

/** Couleurs `DS` utilisees par le design aere. */
enum HLAereColor {
  static let ink = HLColor.hex("#141416")
  static let text2 = HLColor.hex("#3A3A3F")
  static let muted = HLColor.hex("#6C6C70")
  static let surface = HLColor.hex("#F5F5F7")
  static let line = HLColor.hex("#ECECF0")
  static let danger = HLColor.hex("#ef4444")
  static let dangerInk = HLColor.hex("#B42318")
  static let onInkMuted = UIColor(white: 1, alpha: 0.68)
  static let onInkTrack = UIColor(white: 1, alpha: 0.28)
}

/** Degrade sombre des cartes 4 et 7 (`scrimTop` → transparent → `scrimEnd`). */
func HLAereScrim(design: Int) -> HLGradientView {
  HLGradientView(
    colors: [UIColor(white: 0, alpha: 0.35), UIColor(white: 0, alpha: 0), UIColor(white: 0, alpha: 0),
             UIColor(white: 0, alpha: 0.55), UIColor(white: 0, alpha: 0.95)],
    locations: design == 4 ? [0, 0.24, 0.45, 0.7, 1] : [0, 0.22, 0.45, 0.7, 1])
}

// MARK: - Carte 4 : stock en segments

final class HLAereV4Bottom: UIView {
  /** paddingBottom 14 + segments 5 + gap 8 + texte 21. */
  static let height: CGFloat = 48
  private static let segments = 10
  private let stock = UILabel()
  private var bars: [UIView] = []

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    addSubview(stock)
    for _ in 0..<HLAereV4Bottom.segments {
      let v = UIView()
      v.layer.cornerRadius = 2
      addSubview(v)
      bars.append(v)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(_ m: HLMenu) {
    // `gap: 6` entre la valeur et l'unite, alignees sur la ligne de base.
    stock.attributedText = HLText([
      HLKerned(HLRun(m.stockValue, HLFont.w900(17), .white), 6),
      HLRun(m.stockUnit, HLFont.w700(11), HLAereColor.onInkMuted),
    ])
    let filled = Int(ceil(m.stockRatio * CGFloat(HLAereV4Bottom.segments)))
    // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
    let on: UIColor = m.stockLow ? HLAereColor.danger : .white
    for (i, v) in bars.enumerated() { v.backgroundColor = i < filled ? on : HLAereColor.onInkTrack }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // paddingHorizontal 14, paddingBottom 14 ; segments separes de 3.
    let w = bounds.width - 28
    stock.frame = CGRect(x: 14, y: 0, width: w, height: 21)
    let n = CGFloat(bars.count)
    let bw = (w - 3 * (n - 1)) / n
    for (i, v) in bars.enumerated() {
      v.frame = CGRect(x: 14 + CGFloat(i) * (bw + 3), y: 29, width: bw, height: 5)
    }
  }
}

// MARK: - Carte 5 : barre blanche flottante

final class HLAereV5Bar: UIView {
  /** paddingVertical 10 x 2 + texte 15. */
  static let height: CGFloat = 35
  /** Marges de la barre dans la carte (left / right / bottom 10). */
  static let inset: CGFloat = 10
  private let stock = UILabel()
  private let track = UIView()
  private let fill = UIView()
  private var ratio: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .white
    layer.cornerRadius = 14
    layer.shadowColor = HLAereColor.ink.cgColor
    layer.shadowOffset = CGSize(width: 0, height: 6)
    layer.shadowOpacity = 0.18
    layer.shadowRadius = 16
    track.backgroundColor = HLAereColor.line
    track.layer.cornerRadius = 2
    track.clipsToBounds = true
    fill.layer.cornerRadius = 2
    track.addSubview(fill)
    [stock, track].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(_ m: HLMenu) {
    let unit = m.stockUnit.isEmpty ? "" : " \(m.stockUnit)"
    // Rouge fonce : le rouge vif se confondait avec l'orange de marque.
    stock.attributedText = HLRun(m.stockValue + unit, HLFont.w900(12),
                                 m.stockLow ? HLAereColor.dangerInk : HLAereColor.ink)
    fill.backgroundColor = m.stockLow ? HLAereColor.dangerInk : HLAereColor.ink
    ratio = m.stockRatio
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: 14).cgPath
    // paddingHorizontal 12, gap 10 ; la jauge prend le reste de la largeur.
    let sw = min(ceil(stock.sizeThatFits(.zero).width), bounds.width - 24 - 30)
    stock.frame = CGRect(x: 12, y: 10, width: sw, height: 15)
    let tx = 12 + sw + 10
    let tw = max(0, bounds.width - 12 - tx)
    track.frame = CGRect(x: tx, y: (bounds.height - 4) / 2, width: tw, height: 4)
    fill.frame = CGRect(x: 0, y: 0, width: tw * ratio, height: 4)
  }
}

// MARK: - Carte 7 : stock + jauge

final class HLAereV7Bottom: UIView {
  /** paddingBottom 12 + jauge 4 + gap 6 + texte 15. */
  static let height: CGFloat = 37
  private let stock = UILabel()
  private let track = UIView()
  private let fill = UIView()
  private var ratio: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    stock.lineBreakMode = .byTruncatingTail
    track.backgroundColor = HLAereColor.onInkTrack
    track.layer.cornerRadius = 2
    track.clipsToBounds = true
    fill.layer.cornerRadius = 2
    track.addSubview(fill)
    [stock, track].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(_ m: HLMenu) {
    var runs = [HLRun(m.stockValue, HLFont.w900(12), .white)]
    if !m.stockUnit.isEmpty { runs.append(HLRun(" \(m.stockUnit)", HLFont.w700(10), HLAereColor.onInkMuted)) }
    stock.attributedText = HLText(runs)
    // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
    fill.backgroundColor = m.stockLow ? HLAereColor.danger : .white
    ratio = m.stockRatio
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // paddingHorizontal 10, paddingBottom 12, gap 6.
    let w = bounds.width - 20
    stock.frame = CGRect(x: 10, y: 0, width: w, height: 15)
    track.frame = CGRect(x: 10, y: 21, width: w, height: 4)
    fill.frame = CGRect(x: 0, y: 0, width: w * ratio, height: 4)
  }
}

// MARK: - Lignes sous la carte (`V4AereMeta`, `V5AereMeta`, `V7AereMeta`)

enum HLAereMeta {
  /** (titre, droite du titre, ligne 2 gauche, ligne 2 droite). */
  static func texts(design: Int, _ m: HLMenu)
    -> (NSAttributedString, NSAttributedString?, NSAttributedString, NSAttributedString?) {
    let title = HLRun(m.title, HLFont.w900(13), HLAereColor.ink)
    let votes = design == 7 ? "(\(m.votes))" : "(\(m.votes) avis)"
    let rating = HLText([
      HLKerned(HLIcons.attributed("star", size: design == 7 ? 11 : 12, color: HLColor.starYellow), 4),
      HLKerned(HLRun(m.rating, HLFont.w700(11), HLAereColor.ink), 4),
      HLRun(votes, HLFont.w600(11), HLAereColor.muted),
    ])
    var fee = [
      HLRun("Livraison ", HLFont.w700(11), HLAereColor.text2),
      HLRun(m.feeText, HLFont.w800(11), m.feeFree ? HLColor.accent : HLAereColor.ink),
    ]
    let eta = HLRun(m.eta, HLFont.w900(11), HLAereColor.ink)
    switch design {
    case 4:
      let right = HLText([HLRun("Livré en ", HLFont.w700(11), HLAereColor.text2), eta])
      return (title, rating, HLText(fee), right)
    case 5:
      fee += [HLRun(" · Livré en ", HLFont.w700(11), HLAereColor.text2), eta]
      return (title, rating, HLText(fee), nil)
    default:
      fee += [HLRun(" · ", HLFont.w700(11), HLAereColor.text2), eta]
      return (title, rating, HLText(fee), nil)
    }
  }
}
