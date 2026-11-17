import SDWebImage
import UIKit

/**
 Carte plat de la liste categorie. Copie dediee (R16) de la carte V7 aeree de
 `HLMenuCardCell` : photo, degrade sombre, prix, stock + jauge en bas, puis
 SOUS la carte les deux lignes d'infos (nom + note, livraison + delai) et
 leurs squelettes.
 */
final class HLCategoryCardCell: UICollectionViewCell {
  static let reuseId = "category-card"

  // Contenu reel (fondu entrant) et squelettes (fondu sortant).
  let content = UIView()
  let skeletons = UIView()

  private let card = UIView()
  private let image = UIImageView()
  private let scrim = HLAereScrim(design: 7)
  private let price = HLPill(font: HLFont.w900(12), textColor: .black, background: .white,
                             radius: 12, insets: UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10))
  private let stockBar = HLCategoryStockBar()

  private let titleLabel = UILabel()
  private let titleRight = UILabel()
  private let lineLeft = UILabel()

  private let cardSkeleton = HLSkeletonView(radius: HLCLayout.card.radius)
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
    card.layer.cornerRadius = HLCLayout.card.radius
    card.backgroundColor = HLAereColor.ink
    image.contentMode = .scaleAspectFill
    image.clipsToBounds = true
    [image, scrim, stockBar, price].forEach(card.addSubview)
    [titleLabel, titleRight, lineLeft].forEach(content.addSubview)
    titleLabel.lineBreakMode = .byTruncatingTail
    lineLeft.lineBreakMode = .byTruncatingTail
    skeletons.addSubview(cardSkeleton)
    for bar in [metaBar1, metaBar2] {
      bar.backgroundColor = HLColor.skeletonBase
      bar.layer.cornerRadius = 4
      skeletons.addSubview(bar)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  /** `dish == nil` : carte d'un fantome, squelette seul. `revealed` : etat de la rangee. */
  func configure(_ dish: HLCDish?, revealed: Bool) {
    guard let d = dish else {
      image.sd_cancelCurrentImageLoad()
      image.image = nil
      [titleLabel, titleRight, lineLeft].forEach { $0.attributedText = nil }
      price.label.text = nil
      setRevealed(false)
      return
    }
    HLImage.set(image, d.image, size: CGSize(width: HLCLayout.card.width, height: HLCLayout.card.height))
    price.label.text = d.price
    stockBar.configure(d)
    titleLabel.attributedText = HLRun(d.title, HLFont.w900(13), HLAereColor.ink)
    // Sans avis : la note vaut « Nouveau » (JS), pas de « (0) ».
    titleRight.attributedText = HLText([
      HLKerned(HLIcons.attributed("star", size: 11, color: HLColor.starYellow), 4),
      HLKerned(HLRun(d.rating, HLFont.w700(11), HLAereColor.ink), 4),
      HLRun(d.votes > 0 ? "(\(d.votes))" : "", HLFont.w600(11), HLAereColor.muted),
    ])
    lineLeft.attributedText = HLText([
      HLRun("Livraison ", HLFont.w700(11), HLAereColor.text2),
      HLRun(d.feeText, HLFont.w800(11), d.feeFree ? HLColor.accent : HLAereColor.ink),
      HLRun(" · ", HLFont.w700(11), HLAereColor.text2),
      HLRun(d.eta, HLFont.w900(11), HLAereColor.ink),
    ])
    setRevealed(revealed)
    setNeedsLayout()
  }

  /** Bascule instantanee (le fondu est anime par la rangee). */
  func setRevealed(_ revealed: Bool) {
    content.layer.removeAllAnimations()
    skeletons.layer.removeAllAnimations()
    content.alpha = revealed ? 1 : 0
    skeletons.alpha = revealed ? 0 : 1
    setBreathing(!revealed)
  }

  func setBreathing(_ on: Bool) {
    cardSkeleton.setBreathing(on)
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    alpha = 1
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let w = HLCLayout.card.width
    let h = HLCLayout.card.height
    content.frame = contentView.bounds
    skeletons.frame = contentView.bounds
    card.frame = CGRect(x: 0, y: 0, width: w, height: h)
    image.frame = card.bounds
    scrim.frame = card.bounds
    stockBar.frame = CGRect(x: 0, y: h - HLCategoryStockBar.height, width: w, height: HLCategoryStockBar.height)
    let ps = price.sizeThatFits(.zero)
    price.frame = CGRect(x: 8, y: 8, width: ps.width, height: ps.height)

    // ItemMeta : paddingTop 8, paddingLeft 4, gap 3 ; lignes de 16.
    let metaX: CGFloat = 4
    let row1Y = h + 8
    let row2Y = row1Y + 16 + 3
    let trw = ceil(titleRight.sizeThatFits(.zero).width)
    titleRight.frame = CGRect(x: w - trw, y: row1Y, width: trw, height: 16)
    titleLabel.frame = CGRect(x: metaX, y: row1Y, width: max(0, titleRight.frame.minX - 4 - metaX), height: 16)
    lineLeft.frame = CGRect(x: metaX, y: row2Y, width: max(0, w - metaX), height: 16)

    // Squelettes : carte, puis deux barres (70 % x 12, 50 % x 10).
    cardSkeleton.frame = card.frame
    metaBar1.frame = CGRect(x: metaX, y: h + 10, width: w * 0.7, height: 12)
    metaBar2.frame = CGRect(x: metaX, y: h + 28, width: w * 0.5, height: 10)
  }
}

/** Bas de carte : stock (« 12 plats dispo ») + jauge. Copie de `HLAereV7Bottom`. */
final class HLCategoryStockBar: UIView {
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
    fill.layer.cornerRadius = 2
    track.addSubview(fill)
    [stock, track].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(_ d: HLCDish) {
    var runs = [HLRun(d.stockValue, HLFont.w900(12), .white)]
    if !d.stockUnit.isEmpty { runs.append(HLRun(" \(d.stockUnit)", HLFont.w700(10), HLAereColor.onInkMuted)) }
    stock.attributedText = HLText(runs)
    // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
    fill.backgroundColor = d.stockLow ? HLAereColor.danger : .white
    ratio = d.stockRatio
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let w = bounds.width - 20
    stock.frame = CGRect(x: 10, y: 0, width: w, height: 15)
    track.frame = CGRect(x: 10, y: 21, width: w, height: 4)
    fill.frame = CGRect(x: 0, y: 0, width: w * ratio, height: 4)
  }
}
