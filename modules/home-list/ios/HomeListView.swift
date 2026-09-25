import ExpoModulesCore
import UIKit

/**
 Liste native du home : banniere, rangees boutiques, fantomes de la page
 suivante, pied de liste, dans UNE `UICollectionView`.

 JS ne fait que fournir les donnees (props) et recevoir les evenements :
 le defilement, la reutilisation des cellules, les images, les squelettes et
 les fondus vivent entierement cote natif, sans aucun aller-retour JS pendant
 le scroll. C'est ce qui manquait a FlashList : chaque rebind d'une rangee y
 coutait un rendu React complet.

 Identite des rangees = POSITION + design : le fantome du rang N et la vraie
 boutique qui le remplit sont le meme item, simplement reconfigure.
 */
// ⚠️ `internal`, pas `public` : une classe publique devrait declarer `public`
// chacune de ses methodes de delegue UIKit (exigence Swift sur les temoins de
// protocoles publics). Le module l'utilise dans son propre binaire.
final class HomeListView: ExpoView, UICollectionViewDelegateFlowLayout,
  UICollectionViewDataSourcePrefetching, HLShopCellDelegate, HLBannerCellDelegate {

  let onMenuPress = EventDispatcher()
  let onBannerPress = EventDispatcher()
  let onEndReached = EventDispatcher()
  let onRefresh = EventDispatcher()
  let onEdgeChange = EventDispatcher()
  /** Rapports de fluidite (scroll, pages) : journalises cote JS + Sentry. */
  let onDiagnostics = EventDispatcher()
  private let perf = HLPerfMonitor()

  enum Section: Int { case banner, rows, footer }
  enum Item: Hashable {
    case banner
    case row(position: Int, design: Int)
    case footer
  }

  // Props (appliquees ensemble dans `applyProps`).
  var shops: [HLShop] = []
  var banners: [HLBanner] = []
  var bannerLoading = false
  var hasMore = false
  var ghostCount = 3
  var footerText: String?
  var footerIsEmpty = false
  /** Le fetch part quand le premier fantome est a moins de cette distance de l'ecran. */
  var prefetchDistance: CGFloat = 1200
  var bottomInset: CGFloat = 0 { didSet { updateInsets() } }
  var refreshing = false { didSet { if !refreshing && refresher.isRefreshing { refresher.endRefreshing() } } }

  private var collection: UICollectionView!
  private var dataSource: UICollectionViewDiffableDataSource<Section, Item>!
  private let refresher = UIRefreshControl()

  private var rows: [HLRowContent] = []
  private var shownBanners: [HLBanner] = []
  private var shownBannerLoading = false
  private var revealedShops = Set<String>()
  private var menuOffsets: [String: CGFloat] = [:]

  private var fetchArmed = true
  private var atTop = true
  private var nearBottom = false

  // Revelation commune banniere + premiere boutique (une seule fois).
  private var firstGateOpen = false
  private var bannerReady = false
  private var firstShopReady = false
  private weak var bannerCell: HLBannerCell?
  private weak var firstShopCell: HLShopCell?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .white
    setupCollection()
    perf.onReport = { [weak self] report in self?.onDiagnostics(report) }
  }

  private func setupCollection() {
    let layout = UICollectionViewFlowLayout()
    layout.scrollDirection = .vertical
    layout.minimumLineSpacing = 0
    layout.minimumInteritemSpacing = 0
    let cv = UICollectionView(frame: bounds, collectionViewLayout: layout)
    cv.backgroundColor = .white
    cv.contentInsetAdjustmentBehavior = .never
    cv.alwaysBounceVertical = true
    cv.delegate = self
    cv.prefetchDataSource = self
    cv.register(HLBannerCell.self, forCellWithReuseIdentifier: HLBannerCell.reuseId)
    cv.register(HLFooterCell.self, forCellWithReuseIdentifier: HLFooterCell.reuseId)
    for d in HLLayout.designCycle {
      cv.register(HLShopCell.self, forCellWithReuseIdentifier: HLShopCell.reuseId(d))
    }
    refresher.tintColor = HLColor.primary
    refresher.addTarget(self, action: #selector(onPull), for: .valueChanged)
    cv.refreshControl = refresher
    addSubview(cv)
    collection = cv

    dataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: cv) {
      [weak self] cv, indexPath, item in
      guard let self = self else { return UICollectionViewCell() }
      return self.cell(cv, indexPath, item)
    }
  }

  private func cell(_ cv: UICollectionView, _ indexPath: IndexPath, _ item: Item) -> UICollectionViewCell {
    switch item {
    case .banner:
      let c = cv.dequeueReusableCell(withReuseIdentifier: HLBannerCell.reuseId, for: indexPath) as! HLBannerCell
      c.delegate = self
      c.configure(banners: shownBanners, loading: shownBannerLoading)
      return c
    case .row(let position, let design):
      let c = cv.dequeueReusableCell(withReuseIdentifier: HLShopCell.reuseId(design), for: indexPath) as! HLShopCell
      c.delegate = self
      let t0 = CACurrentMediaTime()
      if position < rows.count { c.configure(rows[position], position: position) }
      perf.recordConfigure(CACurrentMediaTime() - t0)
      return c
    case .footer:
      let c = cv.dequeueReusableCell(withReuseIdentifier: HLFooterCell.reuseId, for: indexPath) as! HLFooterCell
      c.configure(text: footerText ?? "", empty: footerIsEmpty)
      return c
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    if collection.frame != bounds {
      collection.frame = bounds
      collection.collectionViewLayout.invalidateLayout()
    }
  }

  private func updateInsets() {
    collection?.contentInset.bottom = bottomInset
    collection?.verticalScrollIndicatorInsets.bottom = bottomInset
  }

  // MARK: - Application des props

  /** Appele une fois par lot de props (`OnViewDidUpdateProps`). */
  func applyProps() {
    var next: [HLRowContent] = shops.map { .shop($0) }
    if hasMore && !shops.isEmpty {
      for pos in shops.count..<(shops.count + ghostCount) {
        next.append(.ghost(design: HLLayout.design(forPosition: pos)))
      }
    }
    let previous = rows
    let bannersChanged = banners != shownBanners || bannerLoading != shownBannerLoading
    // Une page arrivee : on re-arme le fetch (voir `checkEndReached`).
    if next.count != previous.count { fetchArmed = true }
    rows = next
    shownBanners = banners
    shownBannerLoading = bannerLoading

    var snap = NSDiffableDataSourceSnapshot<Section, Item>()
    snap.appendSections([.banner, .rows, .footer])
    if !banners.isEmpty || bannerLoading { snap.appendItems([.banner], toSection: .banner) }
    snap.appendItems(next.enumerated().map { .row(position: $0.offset, design: $0.element.design) },
                     toSection: .rows)
    if footerText != nil { snap.appendItems([.footer], toSection: .footer) }

    // Reconfigurer SEULEMENT ce qui a change et existait deja (fantome rempli,
    // boutique mise a jour par socket, heure de livraison...).
    let old = dataSource.snapshot()
    var changed: [Item] = []
    for (pos, content) in next.enumerated() where pos < previous.count && previous[pos] != content {
      let item = Item.row(position: pos, design: content.design)
      if old.indexOfItem(item) != nil { changed.append(item) }
    }
    if bannersChanged, old.indexOfItem(.banner) != nil { changed.append(.banner) }
    if old.indexOfItem(.footer) != nil { changed.append(.footer) }
    if !changed.isEmpty { snap.reconfigureItems(changed) }

    let t0 = CACurrentMediaTime()
    dataSource.apply(snap, animatingDifferences: false)
    // Sonde : cout d'une arrivee de page (remplissage des fantomes, ajout en
    // queue), mesure pendant ou hors geste.
    if next.count != previous.count || changed.contains(where: { if case .row = $0 { return true }; return false }) {
      let applyMs = ((CACurrentMediaTime() - t0) * 10_000).rounded() / 10
      onDiagnostics([
        "kind": "apply",
        "applyMs": applyMs,
        "rowsBefore": previous.count,
        "rowsAfter": next.count,
        "reconfigured": changed.count,
        "duringScroll": perf.isRunning,
      ])
    }
    DispatchQueue.main.async { [weak self] in self?.checkEndReached() }
  }

  // MARK: - Defilement

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    let y = scrollView.contentOffset.y
    let distanceToEnd = scrollView.contentSize.height + scrollView.contentInset.bottom
      - scrollView.bounds.height - y
    let top = y <= 4
    // `LOADER_VISIBLE_DISTANCE` du home : le loader JS n'apparait qu'en bas.
    let near = distanceToEnd <= 120
    if top != atTop || near != nearBottom {
      atTop = top
      nearBottom = near
      onEdgeChange(["atTop": top, "nearBottom": near])
    }
    checkEndReached()
  }

  // Sonde de fluidite : un rapport par geste (doigt pose → fin de l'elan).
  func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    perf.begin()
  }

  func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
    if !decelerate { perf.end(rows: rows.count, offset: scrollView.contentOffset.y) }
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    perf.end(rows: rows.count, offset: scrollView.contentOffset.y)
  }

  /**
   Page suivante demandee quand le PREMIER fantome approche (`prefetchDistance`),
   donc bien avant qu'il soit a l'ecran. Une seule demande par approche : re-armee
   a l'arrivee d'une page ou quand on s'eloigne.
   */
  private func checkEndReached() {
    guard hasMore, let firstGhost = rows.firstIndex(where: {
      if case .ghost = $0 { return true } else { return false }
    }) else { return }
    guard let attrs = collection.layoutAttributesForItem(
      at: IndexPath(item: firstGhost, section: Section.rows.rawValue)) else { return }
    let viewportBottom = collection.contentOffset.y + collection.bounds.height
    let gap = attrs.frame.minY - viewportBottom
    if gap > prefetchDistance + 200 { fetchArmed = true }
    if gap <= prefetchDistance && fetchArmed {
      fetchArmed = false
      onEndReached([:])
    }
  }

  @objc private func onPull() {
    onRefresh([:])
  }

  func scrollToTop() {
    collection.setContentOffset(CGPoint(x: 0, y: -collection.adjustedContentInset.top), animated: true)
  }

  // MARK: - Tailles

  func collectionView(_ cv: UICollectionView, layout: UICollectionViewLayout,
                      sizeForItemAt indexPath: IndexPath) -> CGSize {
    let w = cv.bounds.width
    guard let item = dataSource.itemIdentifier(for: indexPath) else { return CGSize(width: w, height: 1) }
    switch item {
    case .banner: return CGSize(width: w, height: HLLayout.bannerHeight)
    case .row(_, let design): return CGSize(width: w, height: HLLayout.rowHeight(design))
    case .footer: return CGSize(width: w, height: HLFooterCell.height(empty: footerIsEmpty))
    }
  }

  // MARK: - Prechargement des images des rangees a venir

  func collectionView(_ cv: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
    var items: [(String?, CGSize)] = []
    for ip in indexPaths {
      guard case .row(let pos, let design)? = dataSource.itemIdentifier(for: ip),
            pos < rows.count, case .shop(let s) = rows[pos] else { continue }
      let size = HLLayout.card(design)
      items.append((s.avatar, HLMerchantHeaderView.avatarSize))
      for m in s.menus.prefix(3) { items.append((m.image, CGSize(width: size.width, height: size.height))) }
    }
    HLImage.prefetch(items)
  }

  // MARK: - HLShopCellDelegate

  func shopCell(_ cell: HLShopCell, didTapMenu menuId: String, shopId: String) {
    onMenuPress(["shopId": shopId, "menuId": menuId])
  }

  func isShopRevealed(_ shopId: String) -> Bool { revealedShops.contains(shopId) }

  func shopCellIsReady(_ cell: HLShopCell) {
    if cell.position == 0 && !firstGateOpen {
      firstShopReady = true
      firstShopCell = cell
      tryOpenFirstGate()
      return
    }
    revealShop(cell)
  }

  private func revealShop(_ cell: HLShopCell) {
    if case .shop(let s)? = cell.content { revealedShops.insert(s.id) }
    cell.reveal(animated: true)
  }

  func savedMenuOffset(_ shopId: String) -> CGFloat { menuOffsets[shopId] ?? 0 }
  func saveMenuOffset(_ x: CGFloat, shopId: String) { menuOffsets[shopId] = x }

  // MARK: - HLBannerCellDelegate

  func bannerTapped(_ bannerId: String) {
    onBannerPress(["id": bannerId])
  }

  func bannerIsReady(_ cell: HLBannerCell) {
    bannerReady = true
    bannerCell = cell
    if firstGateOpen { cell.reveal(animated: true) } else { tryOpenFirstGate() }
  }

  /**
   La banniere sort AVEC la premiere boutique, dans la meme animation (comme le
   groupe partage du home RN). Sans boutique, elle sort seule.
   */
  private func tryOpenFirstGate() {
    guard !firstGateOpen else { return }
    let hasShop = rows.contains { if case .shop = $0 { return true } else { return false } }
    let needsBanner = !shownBanners.isEmpty
    guard (firstShopReady || !hasShop) && (bannerReady || !needsBanner) else { return }
    firstGateOpen = true
    if let c = firstShopCell { revealShop(c) }
    bannerCell?.reveal(animated: true)
  }
}
