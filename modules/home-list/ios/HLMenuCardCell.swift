import SDWebImage
import UIKit

/**
 Une carte menu (`DesignItem` + `DesignItemCard` + `ItemMeta`), dans le
 design de sa rangee (7, 4 ou 5), avec SOUS la carte les deux lignes d'infos
 (nom + dispo/note, puis livraison) et leurs squelettes.

 Une cellule garde toute sa vie le meme design (identifiant de reutilisation
 par design) : la reconfigurer ne change que des textes et une image.
 */
final class HLMenuCardCell: UICollectionViewCell {
  static func reuseId(_ design: Int) -> String { "menu-card-\(design)" }

  private(set) var design = 0
  private var size = HLLayout.card(7)

  // Contenu reel (fondu entrant) et squelettes (fondu sortant).
  let content = UIView()
  let skeletons = UIView()

  private let card = UIView()
  private let image = UIImageView()
  private var gradient: HLGradientView?
  private let price = HLPill(font: HLFont.w900(12), textColor: .black, background: .white,
                             radius: 12, insets: UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10))
  private var v7Bottom: HLV7BottomZone?
  private var v4Bar: HLStockDeliveryBar?
  private var v5Bar: HLV5BottomBar?

  // ItemMeta : deux lignes, chacune a gauche + a droite.
  private let titleLabel = UILabel()
  private let titleRight = UILabel()
  private let lineLeft = UILabel()
  private let lineRight = UILabel()

  private var cardSkeleton: HLSkeletonView?
  private let metaBar1 = UIView()
  private let metaBar2 = UIView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.addSubview(content)
    contentView.addSubview(skeletons)
    skeletons.isUserInteractionEnabled = false
    content.addSubview(card)
    card.clipsToBounds = true
    card.layer.cornerCurve = .continuous
    image.contentMode = .scaleAspectFill
    image.clipsToBounds = true
    card.addSubview(image)
    [titleLabel, titleRight, lineLeft, lineRight].forEach(content.addSubview)
    titleLabel.lineBreakMode = .byTruncatingTail
    for bar in [metaBar1, metaBar2] {
      bar.backgroundColor = HLColor.skeletonBase
      bar.layer.cornerRadius = 4
      skeletons.addSubview(bar)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  /** Construit une fois les vues propres au design. */
  private func build(_ d: Int) {
    guard design != d else { return }
    design = d
    size = HLLayout.card(d)
    card.layer.cornerRadius = size.radius

    switch d {
    case 4:
      card.backgroundColor = HLColor.v4Background
      let bar = HLStockDeliveryBar()
      card.addSubview(bar)
      v4Bar = bar
    case 5:
      let bg = HLGradientView(colors: [HLColor.hex("#fafafa"), HLColor.hex("#f0f0f0"), HLColor.hex("#e8e8e8")],
                              start: CGPoint(x: 0, y: 0), end: CGPoint(x: 1, y: 1))
      card.insertSubview(bg, belowSubview: image)
      gradient = bg
      let bar = HLV5BottomBar()
      card.addSubview(bar)
      v5Bar = bar
    default:
      // Triple degrade : haut sombre → transparent → bas tres sombre.
      let g = HLGradientView(
        colors: [UIColor(white: 0, alpha: 0.6), UIColor(white: 1, alpha: 0), UIColor(white: 0, alpha: 0),
                 UIColor(white: 0, alpha: 0.5), UIColor(white: 0, alpha: 0.95)],
        locations: [0, 0.15, 0.35, 0.6, 1])
      card.addSubview(g)
      gradient = g
      let zone = HLV7BottomZone()
      card.addSubview(zone)
      v7Bottom = zone
    }
    card.addSubview(price)

    let skel = HLSkeletonView(radius: size.radius)
    skeletons.insertSubview(skel, at: 0)
    cardSkeleton = skel
  }

  /**
   `menu == nil` : carte d'un fantome, squelette seul.
   `revealed` : etat de la boutique (la cellule ne decide jamais seule).
   */
  func configure(design d: Int, menu: HLMenu?, deliveryTime: String, revealed: Bool) {
    build(d)
    guard let m = menu else {
      image.sd_cancelCurrentImageLoad()
      image.image = nil
      [titleLabel, titleRight, lineLeft, lineRight].forEach { $0.attributedText = nil }
      price.label.text = nil
      setRevealed(false)
      return
    }
    HLImage.set(image, m.image, size: CGSize(width: size.width, height: size.height))
    price.label.text = m.price
    v7Bottom?.configure(deliveryTime: deliveryTime, feeLabel: m.feeLabel)
    v4Bar?.configure(stock: m.stock, deliveryTime: deliveryTime)
    v5Bar?.configure(deliveryTime: deliveryTime, feeLabel: m.feeLabel)
    configureMeta(m)
    setRevealed(revealed)
    setNeedsLayout()
  }

  /** Lignes sous la carte, selon `ItemMeta.tsx` (SHOW_AVAILABILITY = true). */
  private func configureMeta(_ m: HLMenu) {
    let title = HLRun(m.title, HLFont.w900(13), design == 7 ? .black : HLColor.metaTitle)
    titleLabel.attributedText = title
    let orange = HLColor.accent

    switch design {
    case 4:
      titleRight.attributedText = HLText([
        HLKerned(HLIcons.attributed("star", size: 12, color: HLColor.starYellow), 4),
        HLKerned(HLRun(m.rating, HLFont.w700(11), .black), 4),
        HLRun("(\(m.votes) avis)", HLFont.w600(11), HLColor.metaMuted),
      ])
      lineLeft.attributedText = HLText([
        HLRun("Livraison ", HLFont.w700(11), HLColor.metaText),
        HLRun(m.metaFeeLabel, HLFont.w900(11), orange),
      ])
      lineRight.attributedText = HLText([
        HLRun("Livré en ", HLFont.w600(11), HLColor.v4TimeText),
        HLRun("15min", HLFont.w900(13), HLColor.metaTitle),
      ])
    case 5:
      titleRight.attributedText = HLRun("\(m.stock)", HLFont.w700(11), .black)
      lineLeft.attributedText = HLText([
        HLRun("Livré en ", HLFont.w700(11), HLColor.metaText),
        HLRun("30min", HLFont.w900(11), orange),
      ])
      lineRight.attributedText = HLText([
        HLKerned(HLIcons.attributed("star", size: 12, color: HLColor.starYellow), 4),
        HLRun(m.rating, HLFont.w700(11), HLColor.metaText),
      ])
    default:
      titleRight.attributedText = HLRun("\(m.stock)", HLFont.w700(11), .black)
      lineLeft.attributedText = HLText([
        HLRun("Livré en ", HLFont.w700(11), HLColor.metaText),
        HLRun("30min", HLFont.w900(11), orange),
      ])
      lineRight.attributedText = nil
    }
  }

  /** Bascule instantanee (le fondu est anime par la cellule boutique). */
  func setRevealed(_ revealed: Bool) {
    content.alpha = revealed ? 1 : 0
    skeletons.alpha = revealed ? 0 : 1
    setBreathing(!revealed)
  }

  func setBreathing(_ on: Bool) {
    cardSkeleton?.setBreathing(on)
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    alpha = 1
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let w = size.width
    let h = size.height
    content.frame = contentView.bounds
    skeletons.frame = contentView.bounds
    card.frame = CGRect(x: 0, y: 0, width: w, height: h)
    image.frame = card.bounds
    gradient?.frame = card.bounds

    let ps = price.sizeThatFits(.zero)
    // Pastille prix : 8/8 (variants 7 et 5), 14/14 (variant 4).
    let inset: CGFloat = design == 4 ? 14 : 8
    price.frame = CGRect(x: inset, y: inset, width: ps.width, height: ps.height)

    // Hauteur de zone 42 = contenu 32 + paddingBottom 10.
    v7Bottom?.frame = CGRect(x: 0, y: h - HLV7BottomZone.height, width: w, height: HLV7BottomZone.height)
    v4Bar?.frame = CGRect(x: 0, y: h - HLStockDeliveryBar.height, width: w, height: HLStockDeliveryBar.height)
    v5Bar?.frame = CGRect(x: 0, y: h - HLV5BottomBar.height, width: w, height: HLV5BottomBar.height)

    // ItemMeta : paddingTop 8, paddingLeft 4, gap 3 ; lignes de 16.
    let metaX: CGFloat = 4
    let row1Y = h + 8
    let row2Y = row1Y + 16 + 3
    // Variant 7 : `marginRight: 6` apres le stock.
    let rightInset: CGFloat = design == 7 ? 6 : 0
    let trw = ceil(titleRight.sizeThatFits(.zero).width)
    titleRight.frame = CGRect(x: w - rightInset - trw, y: row1Y, width: trw, height: 16)
    titleLabel.frame = CGRect(x: metaX, y: row1Y, width: max(0, titleRight.frame.minX - 4 - metaX), height: 16)
    let lrw = ceil(lineRight.sizeThatFits(.zero).width)
    lineRight.frame = CGRect(x: w - lrw, y: row2Y, width: lrw, height: 16)
    lineLeft.frame = CGRect(x: metaX, y: row2Y, width: max(0, w - metaX - (lrw > 0 ? lrw + 4 : 0)), height: 16)

    // Squelettes : carte, puis deux barres (70 % x 12, 50 % x 10).
    cardSkeleton?.frame = card.frame
    metaBar1.frame = CGRect(x: metaX, y: h + 10, width: w * 0.7, height: 12)
    metaBar2.frame = CGRect(x: metaX, y: h + 28, width: w * 0.5, height: 10)
  }
}
