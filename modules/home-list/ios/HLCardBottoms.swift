import UIKit

/**
 Zones basses des cartes, reprises de `designs/item/parts/CardBottom.tsx`
 (mode `CARD_BOTTOM_STYLE = "blur2"`, rendu iOS) :
 - variant 7 : « Prochaine » + « livraison · HH:MM » + pastille frais, sans fond ;
 - variant 4 : barre floutee « N disponible » + progression / livraison ;
 - variant 5 : barre floutee livraison + pastille frais.
 Flou des variants 4 et 5 : `HLBlurBar` (systeme ou photo floutee d'avance).
 Chaque vue connait sa hauteur (`height`) : la carte la pose en bas.
 */

/** Pastille des frais : fond accent, texte blanc 10/800, padding 7x3, rayon 10. */
func HLMakeFeePill() -> HLPill {
  HLPill(font: HLFont.w800(10), textColor: .white, background: HLColor.accent,
         radius: 10, insets: UIEdgeInsets(top: 3, left: 7, bottom: 3, right: 7))
}

/** Rond blanc 20 px portant l'eclair accent (10 px). */
final class HLFlashBadge: UIView {
  private let icon = UILabel()

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .white
    layer.cornerRadius = 10
    clipsToBounds = true
    icon.textAlignment = .center
    addSubview(icon)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func refresh() {
    icon.attributedText = HLIcons.attributed("flash", size: 10, color: HLColor.accent)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    icon.frame = bounds
  }
}

/** Colonne « Prochaine » / « Livraison HH:MM » des barres 4 et 5. */
private func HLNextLabel() -> NSAttributedString {
  HLRun("Prochaine", HLFont.w700(10), HLColor.deliveryLabel, kern: 0.8)
}

// MARK: - Variant 7

final class HLV7BottomZone: UIView {
  static let height: CGFloat = 42
  private let nextLabel = UILabel()
  private let delivery = UILabel()
  private let fee = HLMakeFeePill()

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    nextLabel.font = HLFont.w800(11)
    nextLabel.textColor = UIColor(white: 1, alpha: 0.7)
    nextLabel.text = "Prochaine"
    delivery.font = HLFont.w900(11)
    delivery.textColor = .white
    [nextLabel,delivery, fee].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(deliveryTime: String, feeLabel: String) {
    delivery.text = "livraison · \(deliveryTime)"
    fee.label.text = feeLabel
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // paddingHorizontal 10, paddingBottom 10 ; rangee de 18 (pastille).
    nextLabel.frame = CGRect(x: 10, y: 0, width: bounds.width - 20, height: 14)
    let rowY: CGFloat = 14
    let dw = ceil(delivery.sizeThatFits(.zero).width)
    delivery.frame = CGRect(x: 10, y: rowY + 2.5, width: dw, height: 14)
    let ps = fee.sizeThatFits(.zero)
    fee.frame = CGRect(x: 10 + dw + 4, y: rowY + (18 - ps.height) / 2, width: ps.width, height: ps.height)
  }
}

// MARK: - Variant 4

final class HLStockDeliveryBar: UIView {
  static let height: CGFloat = 57
  let blur = HLBlurBar()
  private let stockLabel = UILabel()
  private let track = UIView()
  private let fill = UIView()
  private let strip = UIView()
  private let badge = HLFlashBadge()
  private let nextLabel = UILabel()
  private let delivery = UILabel()
  private var stockRatio: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    addSubview(blur)
    track.backgroundColor = UIColor(white: 0, alpha: 0.06)
    track.layer.cornerRadius = 2
    track.clipsToBounds = true
    fill.backgroundColor = HLColor.accent
    fill.layer.cornerRadius = 2
    track.addSubview(fill)
    strip.backgroundColor = UIColor(white: 0, alpha: 0.04)
    strip.layer.cornerRadius = 14
    nextLabel.attributedText = HLNextLabel()
    delivery.font = HLFont.w800(11)
    delivery.textColor = .black
    stockLabel.lineBreakMode = .byClipping
    [badge, nextLabel,delivery].forEach(strip.addSubview)
    [stockLabel, track, strip].forEach(blur.contentView.addSubview)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(stock: Int, deliveryTime: String) {
    stockLabel.attributedText = HLText([
      // `gap: 5` entre le nombre et « disponible » : crenage sur le DERNIER
      // chiffre seulement (un `kern` sur tout le nombre ecartait « 3 9 »).
      HLKerned(HLRun("\(stock)", HLFont.w700(13), .black), 5),
      HLRun("disponible", HLFont.w700(13), .black),
    ])
    stockRatio = min(max(CGFloat(stock) / 100, 0), 1)
    delivery.text = "Livraison \(deliveryTime)"
    badge.refresh()
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    blur.frame = bounds
    // paddingHorizontal 16, paddingVertical 10, gap 10.
    let textW = max(ceil(nextLabel.sizeThatFits(.zero).width), ceil(delivery.sizeThatFits(.zero).width))
    let stripW = 10 + 20 + 6 + textW + 10
    let stripH: CGFloat = 37
    strip.frame = CGRect(x: bounds.width - 16 - stripW, y: 10, width: stripW, height: stripH)
    badge.frame = CGRect(x: 10, y: (stripH - 20) / 2, width: 20, height: 20)
    nextLabel.frame = CGRect(x: 36, y: 6, width: textW, height: 12)
    delivery.frame = CGRect(x: 36, y: 18, width: textW, height: 13)

    let leftW = max(0, strip.frame.minX - 10 - 16)
    let leftH: CGFloat = 16 + 6 + 4
    let leftY = 10 + (stripH - leftH) / 2
    // Comme l'original (`flexShrink: 0`) : le texte n'est jamais tronque, il
    // deborde de sa colonne si besoin (« 0 disponible », pas « 0 disponi... »).
    let stockW = max(leftW, ceil(stockLabel.sizeThatFits(.zero).width))
    stockLabel.frame = CGRect(x: 16, y: leftY, width: stockW, height: 16)
    track.frame = CGRect(x: 16, y: leftY + 22, width: leftW, height: 4)
    fill.frame = CGRect(x: 0, y: 0, width: leftW * stockRatio, height: 4)
  }
}

// MARK: - Variant 5

final class HLV5BottomBar: UIView {
  static let height: CGFloat = 42
  let blur = HLBlurBar()
  private let badge = HLFlashBadge()
  private let nextLabel = UILabel()
  private let delivery = UILabel()
  private let fee = HLMakeFeePill()

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    addSubview(blur)
    nextLabel.attributedText = HLNextLabel()
    delivery.font = HLFont.w800(11)
    delivery.textColor = .black
    [badge, nextLabel,delivery, fee].forEach(blur.contentView.addSubview)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(deliveryTime: String, feeLabel: String) {
    delivery.text = "Livraison \(deliveryTime)"
    fee.label.text = feeLabel
    badge.refresh()
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    blur.frame = bounds
    // paddingHorizontal 12, paddingVertical 6, gap 8 ; colonne 12 + 18.
    badge.frame = CGRect(x: 12, y: (bounds.height - 20) / 2, width: 20, height: 20)
    let x: CGFloat = 12 + 20 + 8
    nextLabel.frame = CGRect(x: x, y: 6, width: bounds.width - x - 12, height: 12)
    let dw = ceil(delivery.sizeThatFits(.zero).width)
    delivery.frame = CGRect(x: x, y: 18 + 2.5, width: dw, height: 13)
    let ps = fee.sizeThatFits(.zero)
    fee.frame = CGRect(x: x + dw + 5, y: 18 + (18 - ps.height) / 2, width: ps.width, height: ps.height)
  }
}
