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
    lastWindow = []
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

    // Galerie FIXE : tout l'espace laisse par le panneau (moins 8 d'ecart).
    let freeW = max(0, inner.width - s.panelWidth - 8)
    galleryClip.frame = CGRect(x: inner.minX, y: inner.minY, width: freeW, height: inner.height)
    let cardH = BPGalleryCard.height
    galleryStrip.frame = CGRect(x: 0, y: (inner.height - cardH) / 2, width: freeW, height: cardH)
    lastWindow = []

    let panelH = BPHeroPanel.height
    panel.frame = CGRect(x: inner.maxX - s.panelWidth, y: inner.minY + (inner.height - panelH) / 2,
                         width: s.panelWidth, height: panelH)
    sync(position: position)
  }

  private var lastWindow: [Int] = []

  /**
   Mini-cartes affichees : autant qu'il en tient (2 minimum), par pages de `k`
   calees pour rester pleines en fin de liste (`galleryWindow` cote RN).
   */
  private func window(index: Int) -> [Int] {
    let n = galleryCards.count
    let k = max(2, Int((galleryStrip.bounds.width + 8) / BPFooterView.galleryStep))
    if n <= k { return Array(0..<n) }
    let start = min((index / k) * k, n - k)
    return Array(start..<(start + k))
  }

  /** Appele a chaque image du scroll : toute l'animation du pied de page. */
  func sync(position p: CGFloat) {
    position = p
    // Galerie FIXE : rien ne defile ; la fenetre ne change qu'en passant a une
    // autre page, et seule la mise en avant varie entre les cartes affichees.
    let idx = Int(max(0, p).rounded())
    let win = window(index: min(idx, max(0, galleryCards.count - 1)))
    if win != lastWindow {
      lastWindow = win
      let cardH = BPGalleryCard.height
      for (i, c) in galleryCards.enumerated() {
        if let slot = win.firstIndex(of: i) {
          c.isHidden = false
          c.frame = CGRect(x: CGFloat(slot) * BPFooterView.galleryStep, y: 0,
                           width: BPGalleryCard.width, height: cardH)
        } else {
          c.isHidden = true
        }
      }
    }
    for (i, c) in galleryCards.enumerated() {
      let distance = abs(p - CGFloat(i))
      c.apply(focus: max(0, 1 - distance), active: distance < 0.5)
    }
    panel.sync(position: p)
  }
}
