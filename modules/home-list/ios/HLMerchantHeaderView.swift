import SDWebImage
import UIKit

/**
 En-tete d'une rangee boutique (`MerchantHeader.tsx`) : avatar 32, nom +
 « Ouvert », puis a droite les chips commandes/avis au-dessus de 5 etoiles.

 Le contenu reel et son squelette sont superposes ; la revelation ne joue que
 sur leurs `alpha` (pilotes par la cellule, dans la meme animation que les
 cartes : tout le groupe bascule a la meme frame).
 */
final class HLMerchantHeaderView: UIView {
  let content = UIView()
  let skeleton = UIView()

  let avatar = UIImageView()
  private let avatarRing = UIView()
  private let nameLabel = UILabel()
  private let statusDot = UIView()
  private let statusLabel = UILabel()
  private let ordersChip = UILabel()
  private let votesChip = UILabel()
  private let ordersChipBg = UIView()
  private let votesChipBg = UIView()
  private let starsLabel = UILabel()
  // Design aere : « ★ 4.5/5 » + pastille grise « N avis ».
  private let aereScore = UILabel()
  private let aereReviews = UILabel()
  private let aereReviewsBg = UIView()
  // Sous la note : « Livraison 13h » / « Livraison express » ; vide = rien.
  private let aereDelivery = UILabel()

  private let avatarSkeleton = HLSkeletonView(radius: 16)
  private let nameSkeleton = HLSkeletonView(radius: 6)
  private let ratingSkeleton = HLSkeletonView(radius: 6)

  static let avatarSize = CGSize(width: 32, height: 32)

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .white
    addSubview(content)
    addSubview(skeleton)
    skeleton.isUserInteractionEnabled = false

    avatarRing.layer.cornerRadius = 16
    avatarRing.layer.borderWidth = 1
    avatarRing.layer.borderColor = HLColor.gray100.cgColor
    avatarRing.clipsToBounds = true
    avatar.contentMode = .scaleAspectFill
    avatar.clipsToBounds = true
    avatarRing.addSubview(avatar)
    content.addSubview(avatarRing)

    nameLabel.font = .systemFont(ofSize: 14, weight: .bold)
    nameLabel.textColor = HLColor.dark
    nameLabel.lineBreakMode = .byTruncatingTail
    content.addSubview(nameLabel)

    statusDot.layer.cornerRadius = 3
    statusDot.backgroundColor = HLColor.green
    content.addSubview(statusDot)
    statusLabel.font = HLFont.w800(10)
    statusLabel.textColor = HLColor.green
    statusLabel.text = "Ouvert"
    content.addSubview(statusLabel)

    for bg in [ordersChipBg, votesChipBg] {
      bg.backgroundColor = HLColor.chip
      bg.layer.cornerRadius = 8
      content.addSubview(bg)
    }
    content.addSubview(ordersChip)
    content.addSubview(votesChip)
    content.addSubview(starsLabel)
    aereReviewsBg.backgroundColor = HLAereColor.surface
    aereReviewsBg.layer.cornerRadius = 8
    [aereScore, aereReviewsBg, aereReviews, aereDelivery].forEach(content.addSubview)

    skeleton.addSubview(avatarSkeleton)
    skeleton.addSubview(nameSkeleton)
    skeleton.addSubview(ratingSkeleton)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  /** `nil` = fantome : seul le squelette a un sens. */
  func configure(_ shop: HLShop?) {
    guard let shop = shop else {
      nameLabel.text = nil
      ordersChip.attributedText = nil
      votesChip.attributedText = nil
      starsLabel.attributedText = nil
      aereScore.attributedText = nil
      aereReviews.attributedText = nil
      aereReviewsBg.isHidden = true
      aereDelivery.attributedText = nil
      aereDelivery.isHidden = true
      avatar.sd_cancelCurrentImageLoad()
      avatar.image = nil
      setNeedsLayout()
      return
    }
    nameLabel.text = shop.name
    // Distance (`MerchantHeader.tsx` : « Ouvert · 1,2 km », distance en gris).
    statusLabel.attributedText = statusText(shop.distance)
    let aere = HLDesign.headerAere
    [ordersChip, votesChip, ordersChipBg, votesChipBg, starsLabel].forEach { $0.isHidden = aere }
    [aereScore, aereReviews, aereReviewsBg].forEach { $0.isHidden = !aere }
    aereDelivery.isHidden = !aere || shop.deliveryLabel.isEmpty
    if aere {
      aereScore.attributedText = HLText([
        HLKerned(HLIcons.attributed("star", size: 13, color: HLColor.starYellow), 3),
        HLRun(shop.ratingText, HLFont.w800(13), HLAereColor.ink),
      ])
      aereReviews.attributedText = HLRun("\(shop.votes) avis", HLFont.w700(10), HLAereColor.text2)
      // `MerchantHeader.tsx` : « Livraison » gris, valeur en accent.
      aereDelivery.attributedText = shop.deliveryLabel.isEmpty ? nil : HLText([
        HLRun("Livraison ", HLFont.w700(10), HLColor.muted),
        HLRun(shop.deliveryLabel, HLFont.w800(10), HLColor.accent),
      ])
      setNeedsLayout()
      return
    }
    ordersChip.attributedText = chipText("receipt-outline", "\(shop.orders)")
    votesChip.attributedText = chipText("people-outline", "\(shop.votes)")
    // Les 5 etoiles sont toutes pleines dans l'original (fond ET remplissage
    // en #e8440a) : on reproduit ce rendu tel quel.
    // `gap: 2` entre etoiles = crenage apres chacune sauf la derniere.
    let stars = NSMutableAttributedString()
    for i in 0..<5 {
      let star = HLIcons.attributed("star", size: 14, color: HLColor.accent)
      stars.append(i < 4 ? HLKerned(star, 2) : star)
    }
    starsLabel.attributedText = stars
    setNeedsLayout()
  }

  private func statusText(_ distance: String) -> NSAttributedString {
    var runs = [HLRun("Ouvert", HLFont.w800(10), HLColor.green)]
    if !distance.isEmpty {
      runs.append(HLRun(" · \(distance)", HLFont.w700(10), HLColor.muted))
    }
    return HLText(runs)
  }

  private func chipText(_ icon: String, _ value: String) -> NSAttributedString {
    HLText([
      HLKerned(HLIcons.attributed(icon, size: 11, color: .black), 3),
      HLRun(value, HLFont.w700(10), HLColor.chipText),
    ])
  }

  func setSkeletonBreathing(_ on: Bool) {
    [avatarSkeleton, nameSkeleton, ratingSkeleton].forEach { $0.setBreathing(on) }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    content.frame = bounds
    skeleton.frame = bounds
    let h = bounds.height
    let cy = h / 2

    // Gauche : avatar + nom / statut (gap 8).
    avatarRing.frame = CGRect(x: 0, y: cy - 16, width: 32, height: 32)
    avatar.frame = avatarRing.bounds
    let nameSize = nameLabel.sizeThatFits(CGSize(width: 120, height: 20))
    let nameH = ceil(nameSize.height)
    let statusH: CGFloat = 12
    let blockTop = cy - (nameH + 1 + statusH) / 2
    nameLabel.frame = CGRect(x: 40, y: blockTop, width: min(120, ceil(nameSize.width)), height: nameH)
    statusDot.frame = CGRect(x: 40, y: blockTop + nameH + 1 + (statusH - 6) / 2, width: 6, height: 6)
    let statusW = ceil(statusLabel.sizeThatFits(.zero).width)
    statusLabel.frame = CGRect(x: 50, y: blockTop + nameH + 1, width: statusW, height: statusH)

    // Droite : chips (paddingH 5, paddingV 2, gap 4) puis etoiles (gap 3).
    let chipH: CGFloat = 18
    let starsH: CGFloat = 17
    let rightTop = cy - (chipH + 3 + starsH) / 2
    var x = bounds.width
    for (label, bg) in [(votesChip, votesChipBg), (ordersChip, ordersChipBg)] {
      let w = ceil(label.sizeThatFits(.zero).width) + 10
      x -= w
      bg.frame = CGRect(x: x, y: rightTop, width: w, height: chipH)
      label.frame = bg.frame.insetBy(dx: 5, dy: 2)
      x -= 4
    }
    let starsW = ceil(starsLabel.sizeThatFits(.zero).width)
    starsLabel.frame = CGRect(x: bounds.width - starsW, y: rightTop + chipH + 3, width: starsW, height: starsH)

    // Design aere : ligne de note (pastille avis a droite, marginLeft 4), puis
    // la livraison dessous (gap 3, alignee a droite) ; le bloc reste centre.
    let deliveryH: CGFloat = aereDelivery.isHidden ? 0 : 12
    let noteTop = deliveryH > 0 ? cy - (18 + 3 + deliveryH) / 2 : cy - 9
    let rw = ceil(aereReviews.sizeThatFits(.zero).width) + 12
    aereReviewsBg.frame = CGRect(x: bounds.width - rw, y: noteTop, width: rw, height: 18)
    aereReviews.frame = aereReviewsBg.frame.insetBy(dx: 6, dy: 2)
    let sw = ceil(aereScore.sizeThatFits(.zero).width)
    aereScore.frame = CGRect(x: aereReviewsBg.frame.minX - 4 - sw, y: noteTop, width: sw, height: 18)
    let dw = ceil(aereDelivery.sizeThatFits(.zero).width)
    aereDelivery.frame = CGRect(x: bounds.width - dw, y: noteTop + 18 + 3, width: dw, height: deliveryH)

    // Squelette : memes emplacements (avatar, nom 110x14, note 82x14).
    avatarSkeleton.frame = avatarRing.frame
    nameSkeleton.frame = CGRect(x: 40, y: cy - 7, width: 110, height: 14)
    ratingSkeleton.frame = CGRect(x: bounds.width - 82, y: cy - 7, width: 82, height: 14)
  }
}
