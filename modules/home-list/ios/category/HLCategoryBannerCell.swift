import SDWebImage
import UIKit

protocol HLCategoryBannerCellDelegate: AnyObject {
  func categoryBannerTapped(_ bannerId: String)
  /** Premiere image prete pour ce tab (`epoch`) : la liste la revele avec la premiere rangee. */
  func categoryBannerIsReady(_ cell: HLCategoryBannerCell, epoch: Int)
}

/**
 Banniere de la liste categorie. Copie dediee (R16) de `HLBannerCell`, sans
 defilement auto (coupe aussi sur « Tout ») : carrousel pagine en boucle
 (clones en tete et en queue), diapos voisines reduites, puces.

 A CHAQUE changement de tab (`epoch`), elle repasse en squelette et attend la
 premiere rangee : banniere et plats sortent ensemble.
 */
final class HLCategoryBannerCell: UICollectionViewCell, UIScrollViewDelegate {
  static let reuseId = "category-banner"

  weak var delegate: HLCategoryBannerCellDelegate?
  private let content = UIView()
  private let scroll = UIScrollView()
  private var wrappers: [UIView] = []
  private var images: [UIImageView] = []
  private var slides: [HLCBanner] = []
  private var banners: [HLCBanner] = []
  private var built = false

  private let dotsRow = UIView()
  private var dotOverlays: [UIView] = []
  private var dotBases: [UIView] = []

  private let skeleton = HLSkeletonView(radius: 24)
  private let dotSkeleton = HLSkeletonView(radius: 4)
  private(set) var revealed = false
  private var shownEpoch = -1
  private var generation = 0
  private var lastWidth: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.backgroundColor = .white
    contentView.addSubview(content)
    scroll.isPagingEnabled = true
    scroll.showsHorizontalScrollIndicator = false
    scroll.scrollsToTop = false
    scroll.clipsToBounds = false
    scroll.delegate = self
    content.addSubview(scroll)
    content.addSubview(dotsRow)
    contentView.addSubview(skeleton)
    contentView.addSubview(dotSkeleton)
    scroll.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(onTap)))
    setRevealed(false)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  private var pageWidth: CGFloat { max(bounds.width, 1) }

  private var slideSize: CGSize {
    CGSize(width: max(bounds.width, UIScreen.main.bounds.width) - 8, height: HLCLayout.bannerSlideHeight)
  }

  // MARK: Configuration

  /**
   `epoch` : numero du tab courant. Nouveau tab = squelette, puis attente de la
   premiere image. `gateOpen` : la liste a deja ouvert ce tab (retour par le
   scroll) : affichage direct si l'image est en memoire.
   */
  func configure(banners new: [HLCBanner], epoch: Int, gateOpen: Bool) {
    let changed = new != banners || !built
    guard changed || epoch != shownEpoch else { return }
    shownEpoch = epoch
    generation += 1
    if changed {
      built = true
      banners = new
      rebuildSlides()
    }
    guard let first = banners.first?.imageUrl else {
      setRevealed(false)
      return
    }
    if gateOpen && HLImage.isInMemory(first, size: slideSize) {
      setRevealed(true)
      delegate?.categoryBannerIsReady(self, epoch: epoch)
      return
    }
    setRevealed(false)
    if HLImage.isInMemory(first, size: slideSize) {
      delegate?.categoryBannerIsReady(self, epoch: epoch)
      return
    }
    let gen = generation
    HLImage.fetch(first, size: slideSize) { [weak self] in
      DispatchQueue.main.async {
        guard let self = self, self.generation == gen else { return }
        self.delegate?.categoryBannerIsReady(self, epoch: epoch)
      }
    }
  }

  private func rebuildSlides() {
    wrappers.forEach { $0.removeFromSuperview() }
    wrappers.removeAll()
    images.removeAll()
    dotOverlays.forEach { $0.removeFromSuperview() }
    dotBases.forEach { $0.removeFromSuperview() }
    dotOverlays.removeAll()
    dotBases.removeAll()

    let n = banners.count
    slides = n > 1 ? [banners[n - 1]] + banners + [banners[0]] : banners
    for b in slides {
      let wrapper = UIView()
      wrapper.backgroundColor = HLColor.bannerBackground
      wrapper.layer.cornerRadius = 24
      wrapper.layer.cornerCurve = .continuous
      wrapper.clipsToBounds = true
      let iv = UIImageView()
      iv.contentMode = .scaleAspectFill
      iv.clipsToBounds = true
      wrapper.addSubview(iv)
      if let t = b.title, !t.isEmpty {
        let label = UILabel()
        label.text = t
        label.font = HLFont.w700(16)
        label.textColor = .white
        label.layer.shadowColor = UIColor.black.cgColor
        label.layer.shadowOpacity = 0.35
        label.layer.shadowOffset = CGSize(width: 0, height: 1)
        label.layer.shadowRadius = 4
        label.tag = 7
        wrapper.addSubview(label)
      }
      scroll.addSubview(wrapper)
      wrappers.append(wrapper)
      images.append(iv)
      HLImage.set(iv, b.imageUrl, size: slideSize)
    }
    if n > 1 {
      for _ in 0..<n {
        let base = UIView()
        base.backgroundColor = HLColor.dot
        base.layer.cornerRadius = 3.5
        let overlay = UIView()
        overlay.backgroundColor = HLColor.primary
        overlay.layer.cornerRadius = 3.5
        overlay.alpha = 0
        dotsRow.addSubview(base)
        dotsRow.addSubview(overlay)
        dotBases.append(base)
        dotOverlays.append(overlay)
      }
    }
    dotSkeleton.isHidden = n <= 1
    setNeedsLayout()
    layoutIfNeeded()
    scroll.contentOffset = CGPoint(x: n > 1 ? pageWidth : 0, y: 0)
    applyScrollEffects()
  }

  // MARK: Revelation

  func reveal(animated: Bool) {
    guard !revealed, !banners.isEmpty else { return }
    if animated {
      UIView.animate(withDuration: HLCLayout.revealDuration, delay: 0,
                     options: [.curveEaseOut, .allowUserInteraction, .beginFromCurrentState],
                     animations: { self.setRevealed(true) })
    } else {
      setRevealed(true)
    }
  }

  private func setRevealed(_ r: Bool) {
    revealed = r
    content.alpha = r ? 1 : 0
    skeleton.alpha = r ? 0 : 1
    dotSkeleton.alpha = r ? 0 : 1
    skeleton.setBreathing(!r)
    dotSkeleton.setBreathing(!r)
  }

  // MARK: Mise en page

  override func layoutSubviews() {
    super.layoutSubviews()
    let w = pageWidth
    content.frame = bounds
    let top = HLCLayout.bannerTop
    let h = HLCLayout.bannerSlideHeight
    let offsetPage = scroll.contentOffset.x / max(scroll.bounds.width, 1)
    scroll.frame = CGRect(x: 0, y: top, width: w, height: h)
    scroll.contentSize = CGSize(width: w * CGFloat(slides.count), height: h)
    for (i, wrapper) in wrappers.enumerated() {
      wrapper.transform = .identity
      wrapper.frame = CGRect(x: CGFloat(i) * w + 4, y: 0, width: w - 8, height: h)
      images[i].frame = wrapper.bounds
      if let label = wrapper.viewWithTag(7) {
        label.frame = CGRect(x: 16, y: h - 16 - 20, width: w - 8 - 32, height: 20)
      }
    }
    if lastWidth > 0, lastWidth != w {
      scroll.contentOffset = CGPoint(x: round(offsetPage) * w, y: 0)
    }
    lastWidth = w
    skeleton.frame = CGRect(x: 4, y: top, width: w - 8, height: h)

    // Puces : emplacements de 12 x 7, rangee centree, 25 px sous la diapo.
    let n = dotBases.count
    let rowW = CGFloat(n) * 15 + 12
    dotsRow.frame = CGRect(x: (w - rowW) / 2, y: top + h + 25 - 18, width: rowW, height: 18)
    for i in 0..<n {
      let slot = CGRect(x: 6 + 1.5 + CGFloat(i) * 15, y: 5.5, width: 12, height: 7)
      dotBases[i].frame = CGRect(x: slot.midX - 3.5, y: slot.minY, width: 7, height: 7)
      dotOverlays[i].frame = slot
    }
    dotSkeleton.frame = CGRect(x: (w - 18) / 2, y: top + h + 25 - 18 + 5.5, width: 18, height: 7)
    applyScrollEffects()
  }

  // MARK: Defilement

  private func applyScrollEffects() {
    let w = pageWidth
    let x = scroll.contentOffset.x
    for (i, wrapper) in wrappers.enumerated() {
      let d = min(abs(x - CGFloat(i) * w) / w, 1)
      let s = 1 - 0.6 * d
      wrapper.transform = CGAffineTransform(scaleX: s, y: s)
      wrapper.alpha = 1 - 0.2 * d
    }
    let n = banners.count
    guard n > 1, dotOverlays.count == n else { return }
    let p = x / w
    for i in 0..<n {
      var anchors: [CGFloat] = [CGFloat(i + 1)]
      if i == 0 { anchors.append(CGFloat(n + 1)) }
      if i == n - 1 { anchors.append(0) }
      dotOverlays[i].alpha = anchors.map { max(0, 1 - abs(p - $0)) }.max() ?? 0
    }
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    applyScrollEffects()
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) { teleportIfOnClone() }
  func scrollViewDidEndScrollingAnimation(_ scrollView: UIScrollView) { teleportIfOnClone() }

  /** Boucle infinie : un clone atteint, on saute sans animation sur la vraie diapo. */
  private func teleportIfOnClone() {
    let n = banners.count
    guard n > 1 else { return }
    let w = pageWidth
    let page = Int(round(scroll.contentOffset.x / w))
    if page == 0 {
      scroll.contentOffset = CGPoint(x: CGFloat(n) * w, y: 0)
    } else if page == n + 1 {
      scroll.contentOffset = CGPoint(x: w, y: 0)
    }
  }

  @objc private func onTap(_ g: UITapGestureRecognizer) {
    guard !slides.isEmpty else { return }
    let page = Int(round(scroll.contentOffset.x / pageWidth))
    guard page >= 0, page < slides.count else { return }
    let b = slides[page]
    if b.tappable { delegate?.categoryBannerTapped(b.id) }
  }
}
