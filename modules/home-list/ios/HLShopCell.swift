import SDWebImage
import UIKit

protocol HLShopCellDelegate: AnyObject {
  func shopCell(_ cell: HLShopCell, didTapMenu menuId: String, shopId: String)
  /** Boutique deja revelee une fois : reaffichage direct, sans squelette. */
  func isShopRevealed(_ shopId: String) -> Bool
  /** La boutique est prete. Le delegue revele tout de suite, ou plus tard (banniere). */
  func shopCellIsReady(_ cell: HLShopCell)
  func savedMenuOffset(_ shopId: String) -> CGFloat
  func saveMenuOffset(_ x: CGFloat, shopId: String)
}

/**
 Rangee boutique (`Design7/4/5` + `ShopRevealProvider`) : en-tete, puis cartes
 menu dans une liste horizontale native.

 Revelation GROUPEE, comme `ShopRevealContext` : l'avatar et les images des
 cartes visibles sont attendus ensemble (8 s max), puis en-tete et cartes
 passent du squelette au contenu dans UNE animation — meme frame pour tous.
 Si tout est deja en memoire (boutique revue, recyclage), aucun squelette.
 */
final class HLShopCell: UICollectionViewCell, UICollectionViewDataSource, UICollectionViewDelegate,
  UICollectionViewDataSourcePrefetching {
  static func reuseId(_ design: Int) -> String { "shop-row-\(design)" }

  weak var delegate: HLShopCellDelegate?
  let header = HLMerchantHeaderView()
  private var menus: UICollectionView!
  private var design = 0
  private(set) var content: HLRowContent?
  private(set) var position = 0
  private(set) var revealed = false
  private var generation = 0
  private var pending = Set<String>()
  private var ops: [SDWebImageCombinedOperation] = []
  private var timeout: DispatchWorkItem?

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.backgroundColor = .white
    contentView.addSubview(header)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  private var shop: HLShop? {
    if case .shop(let s) = content { return s }
    return nil
  }

  private var cardSize: HLCardSize { HLLayout.card(design) }

  /** Une fois par cellule : l'identifiant de reutilisation fixe le design. */
  private func build(_ d: Int) {
    guard menus == nil else { return }
    design = d
    let layout = UICollectionViewFlowLayout()
    layout.scrollDirection = .horizontal
    layout.minimumLineSpacing = HLLayout.cardGap
    layout.minimumInteritemSpacing = 0
    let s = HLLayout.card(d)
    layout.itemSize = CGSize(width: s.width, height: s.height + HLLayout.metaHeight)
    let cv = UICollectionView(frame: .zero, collectionViewLayout: layout)
    cv.backgroundColor = .clear
    cv.showsHorizontalScrollIndicator = false
    cv.clipsToBounds = true
    cv.dataSource = self
    cv.delegate = self
    cv.prefetchDataSource = self
    cv.register(HLMenuCardCell.self, forCellWithReuseIdentifier: HLMenuCardCell.reuseId(d))
    contentView.addSubview(cv)
    menus = cv
  }

  // MARK: Configuration

  func configure(_ c: HLRowContent, position pos: Int) {
    build(c.design)
    generation += 1
    cancelLoads()
    content = c
    position = pos

    switch c {
    case .ghost:
      header.configure(nil)
      applyRevealed(false)
      menus.reloadData()
      menus.setContentOffset(.zero, animated: false)
    case .shop(let s):
      header.configure(s)
      HLImage.set(header.avatar, s.avatar, size: HLMerchantHeaderView.avatarSize)
      let pendingUrls = revealUrls(s)
      let already = delegate?.isShopRevealed(s.id) ?? false
      let inMemory = pendingUrls.allSatisfy { HLImage.isInMemory($0.0, size: $0.1) }
      applyRevealed(already || inMemory)
      menus.reloadData()
      menus.setContentOffset(CGPoint(x: delegate?.savedMenuOffset(s.id) ?? 0, y: 0), animated: false)
      if already || inMemory {
        delegate?.shopCellIsReady(self)
      } else {
        waitFor(pendingUrls)
      }
    }
    setNeedsLayout()
  }

  /** Images attendues : avatar + cartes visibles a l'ouverture de la rangee. */
  private func revealUrls(_ s: HLShop) -> [(String, CGSize)] {
    var out: [(String, CGSize)] = []
    if let a = s.avatar, !a.isEmpty { out.append((a, HLMerchantHeaderView.avatarSize)) }
    let width = max(bounds.width, UIScreen.main.bounds.width) - 2 * HLLayout.sidePadding
    let visible = Int(ceil(width / (cardSize.width + HLLayout.cardGap)))
    let size = CGSize(width: cardSize.width, height: cardSize.height)
    for m in s.menus.prefix(visible) {
      if let u = m.image, !u.isEmpty { out.append((u, size)) }
    }
    return out
  }

  private func waitFor(_ urls: [(String, CGSize)]) {
    let gen = generation
    pending = Set(urls.map { $0.0 })
    if pending.isEmpty {
      delegate?.shopCellIsReady(self)
      return
    }
    for (u, size) in urls {
      let op = HLImage.fetch(u, size: size) { [weak self] in
        DispatchQueue.main.async {
          guard let self = self, self.generation == gen else { return }
          self.pending.remove(u)
          if self.pending.isEmpty { self.becameReady() }
        }
      }
      if let op = op { ops.append(op) }
    }
    let work = DispatchWorkItem { [weak self] in
      guard let self = self, self.generation == gen else { return }
      self.becameReady()
    }
    timeout = work
    DispatchQueue.main.asyncAfter(deadline: .now() + HLLayout.revealMaxWait, execute: work)
  }

  private func becameReady() {
    timeout?.cancel()
    timeout = nil
    pending.removeAll()
    delegate?.shopCellIsReady(self)
  }

  private func cancelLoads() {
    ops.forEach { $0.cancel() }
    ops.removeAll()
    timeout?.cancel()
    timeout = nil
    pending.removeAll()
  }

  // MARK: Revelation

  /** Appele par le delegue quand le groupe doit sortir (fondu 220 ms). */
  func reveal(animated: Bool) {
    guard shop != nil, !revealed else { return }
    revealed = true
    let changes = {
      self.header.content.alpha = 1
      self.header.skeleton.alpha = 0
      for case let cell as HLMenuCardCell in self.menus.visibleCells {
        cell.content.alpha = 1
        cell.skeletons.alpha = 0
      }
    }
    let done: (Bool) -> Void = { _ in
      guard self.revealed else { return }
      self.header.setSkeletonBreathing(false)
      for case let cell as HLMenuCardCell in self.menus.visibleCells { cell.setBreathing(false) }
    }
    if animated {
      UIView.animate(withDuration: HLLayout.revealDuration, delay: 0,
                     options: [.curveEaseOut, .allowUserInteraction, .beginFromCurrentState],
                     animations: changes, completion: done)
    } else {
      changes()
      done(true)
    }
  }

  private func applyRevealed(_ r: Bool) {
    revealed = r
    header.content.alpha = r ? 1 : 0
    header.skeleton.alpha = r ? 0 : 1
    header.setSkeletonBreathing(!r)
  }

  // MARK: Cycle de vie

  override func prepareForReuse() {
    super.prepareForReuse()
    if let s = shop, let cv = menus { delegate?.saveMenuOffset(cv.contentOffset.x, shopId: s.id) }
    generation += 1
    cancelLoads()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let pad = HLLayout.sidePadding
    let w = bounds.width - 2 * pad
    header.frame = CGRect(x: pad, y: HLLayout.rowTop, width: w, height: HLLayout.headerHeight)
    let y = HLLayout.rowTop + HLLayout.headerHeight + HLLayout.headerGap
    menus?.frame = CGRect(x: pad, y: y, width: w, height: cardSize.height + HLLayout.metaHeight)
  }

  // MARK: Cartes (liste horizontale)

  func collectionView(_ cv: UICollectionView, numberOfItemsInSection section: Int) -> Int {
    switch content {
    case .ghost: return HLGhostMenuCount
    case .shop(let s): return s.menus.count
    case .none: return 0
    }
  }

  func collectionView(_ cv: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
    let cell = cv.dequeueReusableCell(withReuseIdentifier: HLMenuCardCell.reuseId(design),
                                      for: indexPath) as! HLMenuCardCell
    let s = shop
    let menu = s.flatMap { indexPath.item < $0.menus.count ? $0.menus[indexPath.item] : nil }
    cell.configure(design: design, menu: menu, deliveryTime: s?.deliveryTime ?? "", revealed: revealed)
    return cell
  }

  func collectionView(_ cv: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
    guard let s = shop else { return }
    let size = CGSize(width: cardSize.width, height: cardSize.height)
    var items: [(String?, CGSize)] = []
    for ip in indexPaths where ip.item < s.menus.count {
      items.append((s.menus[ip.item].image, size))
    }
    HLImage.prefetch(items)
  }

  func collectionView(_ cv: UICollectionView, shouldHighlightItemAt indexPath: IndexPath) -> Bool {
    shop != nil
  }

  // `activeOpacity={0.9}` des cartes.
  func collectionView(_ cv: UICollectionView, didHighlightItemAt indexPath: IndexPath) {
    cv.cellForItem(at: indexPath)?.alpha = 0.9
  }

  func collectionView(_ cv: UICollectionView, didUnhighlightItemAt indexPath: IndexPath) {
    cv.cellForItem(at: indexPath)?.alpha = 1
  }

  func collectionView(_ cv: UICollectionView, didSelectItemAt indexPath: IndexPath) {
    cv.deselectItem(at: indexPath, animated: false)
    guard let s = shop, indexPath.item < s.menus.count else { return }
    delegate?.shopCell(self, didTapMenu: s.menus[indexPath.item].id, shopId: s.id)
  }
}
