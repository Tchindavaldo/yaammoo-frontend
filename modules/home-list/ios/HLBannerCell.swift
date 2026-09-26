import SDWebImage
import UIKit

protocol HLBannerCellDelegate: AnyObject {
  func bannerTapped(_ bannerId: String)
  /** Premiere image prete : le delegue la revele avec la premiere boutique. */
  func bannerIsReady(_ cell: HLBannerCell)
}

/**
 Banniere du home (`HeroBanner.tsx` + `useBannerLoop`) : carrousel pagine en
 boucle infinie (clones en tete et en queue), defilement auto toutes les
 3,5 s (pause de 20 s apres un geste), diapos voisines reduites (echelle 0,4,
 opacite 0,8), puces sous la diapo, squelette jusqu'a la premiere image.
 */
final class HLBannerCell: UICollectionViewCell, UIScrollViewDelegate {
  static let reuseId = "banner"
  private static let autoplay: TimeInterval = 3.5
  private static let autoplayPause: TimeInterval = 20

  weak var delegate: HLBannerCellDelegate?
  private let content = UIView()
  private let scroll = UIScrollView()
  private var wrappers: [UIView] = []
  private var images: [UIImageView] = []
  private var slides: [HLBanner] = []
  private var banners: [HLBanner] = []

  private let dotsRow = UIView()
  private var dotOverlays: [UIView] = []
  private var dotBases: [UIView] = []

  private let skeleton = HLSkeletonView(radius: 24)
  private let dotSkeleton = HLSkeletonView(radius: 4)
  private(set) var revealed = false
  private var generation = 0

  private var timer: Timer?
  private var resume: DispatchWorkItem?
  private var lastWidth: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
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
    let tap = UITapGestureRecognizer(target: self, action: #selector(onTap))
    scroll.addGestureRecognizer(tap)
    // Autoplay coupe hors premier plan (arriere-plan, ecran eteint, centre de
    // controle) : sinon les avances s'empilent sans s'achever et, au retour,
    // le carrousel defile a toute vitesse avant de se recaler.
    let nc = NotificationCenter.default
    nc.addObserver(self, selector: #selector(appWillResignActive),
                   name: UIApplication.willResignActiveNotification, object: nil)
    nc.addObserver(self, selector: #selector(appDidBecomeActive),
                   name: UIApplication.didBecomeActiveNotification, object: nil)
  }

  @objc private func appWillResignActive() {
    stopAutoplay()
    resume?.cancel()
    snapToPage()
  }

  @objc private func appDidBecomeActive() {
    snapToPage()
    if window != nil { startAutoplay() }
  }

  /** Recale sans animation sur la diapo la plus proche (jamais sur un clone). */
  private func snapToPage() {
    guard !slides.isEmpty else { return }
    let w = pageWidth
    let page = min(max(round(scroll.contentOffset.x / w), 0), CGFloat(slides.count - 1))
    scroll.setContentOffset(CGPoint(x: page * w, y: 0), animated: false)
    teleportIfOnClone()
    applyScrollEffects()
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  private var pageWidth: CGFloat { max(bounds.width, 1) }

  // MARK: Configuration

  func configure(banners new: [HLBanner], loading: Bool) {
    guard new != banners || wrappers.isEmpty else { return }
    generation += 1
    banners = new
    rebuildSlides()
    if banners.isEmpty {
      // Chargement sans banniere encore recue : squelette seul.
      setRevealed(false)
      return
    }
    let first = banners[0].imageUrl
    let size = slideSize
    if revealed || HLImage.isInMemory(first, size: size) {
      setRevealed(true)
      delegate?.bannerIsReady(self)
    } else {
      setRevealed(false)
      let gen = generation
      HLImage.fetch(first, size: size) { [weak self] in
        DispatchQueue.main.async {
          guard let self = self, self.generation == gen else { return }
          self.delegate?.bannerIsReady(self)
        }
      }
    }
    startAutoplay()
  }

  private var slideSize: CGSize {
    CGSize(width: pageWidth - 8, height: HLLayout.bannerSlideHeight)
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
    dotSkeleton.isHidden = n == 1
    setNeedsLayout()
    layoutIfNeeded()
    scroll.contentOffset = CGPoint(x: n > 1 ? pageWidth : 0, y: 0)
    applyScrollEffects()
  }

  // MARK: Revelation

  func reveal(animated: Bool) {
    guard !revealed, !banners.isEmpty else { return }
    let changes = { self.setRevealed(true) }
    if animated {
      UIView.animate(withDuration: HLLayout.revealDuration, delay: 0,
                     options: [.curveEaseOut, .allowUserInteraction], animations: changes)
    } else {
      changes()
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
    let top = HLLayout.bannerTop
    let h = HLLayout.bannerSlideHeight
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
    // Garde la page courante si la largeur change (rotation) — jamais sinon,
    // pour ne pas recaler une diapo en plein geste.
    if lastWidth > 0, lastWidth != w {
      scroll.contentOffset = CGPoint(x: round(offsetPage) * w, y: 0)
    }
    lastWidth = w
    skeleton.frame = CGRect(x: 4, y: top, width: w - 8, height: h)

    // Puces : emplacements de 12 x 7 (marge 1,5), rangee de 18 centree,
    // posee 25 px sous la diapo (bottom: -25).
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
    guard n > 1 else { return }
    let p = x / w
    for i in 0..<n {
      // Banniere i : diapo reelle i + 1, et son clone (0 pour la derniere,
      // n + 1 pour la premiere).
      var anchors: [CGFloat] = [CGFloat(i + 1)]
      if i == 0 { anchors.append(CGFloat(n + 1)) }
      if i == n - 1 { anchors.append(0) }
      let a = anchors.map { max(0, 1 - abs(p - $0)) }.max() ?? 0
      dotOverlays[i].alpha = a
    }
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    applyScrollEffects()
  }

  func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    stopAutoplay()
    resume?.cancel()
    let work = DispatchWorkItem { [weak self] in self?.startAutoplay() }
    resume = work
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.autoplayPause, execute: work)
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

  private func startAutoplay() {
    stopAutoplay()
    guard banners.count > 1, window != nil else { return }
    timer = Timer.scheduledTimer(withTimeInterval: Self.autoplay, repeats: true) { [weak self] _ in
      guard let self = self, !self.scroll.isDragging, !self.scroll.isDecelerating,
            UIApplication.shared.applicationState == .active else { return }
      // Part toujours d'une vraie diapo : une avance interrompue ne laisse
      // jamais le carrousel au-dela des clones.
      self.teleportIfOnClone()
      let w = self.pageWidth
      let page = round(self.scroll.contentOffset.x / w)
      self.scroll.setContentOffset(CGPoint(x: (page + 1) * w, y: 0), animated: true)
    }
  }

  private func stopAutoplay() {
    timer?.invalidate()
    timer = nil
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      stopAutoplay()
      resume?.cancel()
    } else if timer == nil {
      startAutoplay()
    }
  }

  @objc private func onTap(_ g: UITapGestureRecognizer) {
    guard !slides.isEmpty else { return }
    let page = Int(round(scroll.contentOffset.x / pageWidth))
    guard page >= 0, page < slides.count else { return }
    let b = slides[page]
    if b.tappable { delegate?.bannerTapped(b.id) }
  }
}
