import UIKit

/**
 Pied de page de la sheet Bonus : carte blanche portant, a gauche, la galerie
 de mini-cartes et, a droite, le panneau heros (`BPHeroPanel`). Reprise UIKit
 de la carte de pagination de `UserBonusSheet` (`BonusGalleryCard` +
 `BonusPagerInfo`).

 Rien n'y est anime par une horloge : tout est une fonction de `position`
 (0 = 1er bonus, 1 = 2e..., fractionnaire pendant le geste), recue de
 `scrollViewDidScroll`. Le pied de page ne peut donc pas prendre de retard
 sur le doigt, ni le rattraper apres coup.
 */
final class BPFooterView: UIView {
  /** Tap sur une mini-carte : index du bonus vise. */
  var onSelect: ((Int) -> Void)?

  // Cotes de `UserBonusSheet` (pagCard), `gallery.constants.ts`, `BonusPagerInfo`.
  private static let cardMarginX: CGFloat = 6
  private static let cardMarginTop: CGFloat = 10
  private static let cardPad: CGFloat = 10
  private static let cardRadius: CGFloat = 20
  static let galleryStep = BPGalleryCard.width + 8
  /** Deux mini-cartes visibles ; la galerie defile derriere la carte active. */
  private static let galleryWidth = 2 * galleryStep
  /** `paddingRight: 4` du contenu de la galerie. */
  private static let galleryTrailing: CGFloat = 4
  static let panelWidth: CGFloat = 168

  private let card = UIView()
  private let galleryClip = UIView()
  private let galleryStrip = UIView()
  private var galleryCards: [BPGalleryCard] = []
  private let panel = BPHeroPanel()
  private var position: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    card.backgroundColor = .white
    card.layer.cornerRadius = BPFooterView.cardRadius
    card.layer.cornerCurve = .continuous
    card.layer.borderWidth = 0.5
    card.layer.borderColor = UIColor(white: 0, alpha: 0.04).cgColor
    addSubview(card)
    galleryClip.clipsToBounds = true
    galleryClip.addSubview(galleryStrip)
    card.addSubview(galleryClip)
    card.addSubview(panel)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  /** Reconstruit les mini-cartes et le panneau (nouvelle liste, statut change...). */
  func configure(items: [BPItem], textColor: UIColor, iconFontFamily: String?) {
    galleryCards.forEach { $0.removeFromSuperview() }
    galleryCards = items.enumerated().map { (i, item) -> BPGalleryCard in
      let c = BPGalleryCard(item: item, activeTextColor: textColor, iconFontFamily: iconFontFamily)
      c.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(onTap(_:))))
      c.tag = i
      galleryStrip.addSubview(c)
      return c
    }
    panel.configure(items: items, iconFontFamily: iconFontFamily)
    setNeedsLayout()
  }

  @objc private func onTap(_ g: UITapGestureRecognizer) {
    guard let i = g.view?.tag else { return }
    onSelect?(i)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let s = BPFooterView.self
    card.frame = CGRect(x: s.cardMarginX, y: s.cardMarginTop,
                        width: max(0, bounds.width - 2 * s.cardMarginX),
                        height: max(0, bounds.height - s.cardMarginTop))
    let inner = card.bounds.insetBy(dx: s.cardPad, dy: s.cardPad)

    galleryClip.frame = CGRect(x: inner.minX, y: inner.minY, width: s.galleryWidth, height: inner.height)
    let cardH = BPGalleryCard.height
    for (i, c) in galleryCards.enumerated() {
      c.frame = CGRect(x: CGFloat(i) * s.galleryStep, y: 0, width: BPGalleryCard.width, height: cardH)
    }
    galleryStrip.frame = CGRect(x: 0, y: (inner.height - cardH) / 2, width: stripWidth, height: cardH)

    let panelH = BPHeroPanel.height
    panel.frame = CGRect(x: inner.maxX - s.panelWidth, y: inner.minY + (inner.height - panelH) / 2,
                         width: s.panelWidth, height: panelH)
    sync(position: position)
  }

  /** Largeur du contenu de la galerie (cartes + ecarts + marge de fin). */
  private var stripWidth: CGFloat {
    guard !galleryCards.isEmpty else { return 0 }
    return CGFloat(galleryCards.count) * BPFooterView.galleryStep - 8 + BPFooterView.galleryTrailing
  }

  /** Appele a chaque image du scroll : toute l'animation du pied de page. */
  func sync(position p: CGFloat) {
    position = p
    // Galerie : la carte active reste calee a gauche, bornee au bout du contenu
    // (comme le `scrollTo` d'un ScrollView, qui ne depasse pas sa fin).
    let maxX = max(0, stripWidth - BPFooterView.galleryWidth)
    let x = min(max(0, p * BPFooterView.galleryStep), maxX)
    galleryStrip.frame.origin.x = -x
    for (i, c) in galleryCards.enumerated() {
      let distance = abs(p - CGFloat(i))
      c.apply(focus: max(0, 1 - distance), active: distance < 0.5)
    }
    panel.sync(position: p)
  }
}
