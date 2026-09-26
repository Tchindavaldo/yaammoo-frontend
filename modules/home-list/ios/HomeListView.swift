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

  // Boutiques et etat de fin de liste : fonction `updateRows` (jamais des
  // props, cf. HomeListModule). Le reste : props, appliquees ensemble dans
  // `applyProps`.
  var shops: [HLShop] = []
  var banners: [HLBanner] = []
  var bannerLoading = false
  var hasMore = false
  var ghostCount = 3
  var footerText: String?
  var footerIsEmpty = false
  /**
   Premiere page en cours. VRAI par defaut : la banniere (prop) arrive avant le
   premier `updateRows`, et ne doit pas sortir seule en croyant la liste vide.
   */
  var listLoading = true
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

  /** Rangees recues au dernier `updateRows` et cout de leur pose (sonde). */
  private var lastPatch: (rows: Int, ms: Double)?

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
    // Pixel de la sonde ecran, au-dessus de la liste (coin haut gauche, marge blanche).
    layer.addSublayer(perf.screen.layer)
    perf.offsetProvider = { [weak self] in self?.collection.contentOffset.y ?? 0 }
    perf.onReport = { [weak self] report in
      var r = report
      // Rendu des barres floutees + cout du flou d'avance : de quoi comparer
      // `live` et `baked` rapport par rapport.
      r["blur"] = HLBlurBar.mode.rawValue
      r["bakes"] = HLBlurBar.bakes
      r["bakeMaxMs"] = HLBlurBar.bakeMaxMs
      self?.onDiagnostics(r)
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
      self?.perf.screen.warmUp()
    }
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

  // MARK: - Mise a jour des boutiques

  /**
   Mise a jour PARTIELLE (fonction `updateRows`) : les rangees ont deja ete
   decodees sur le fil JS, il ne reste ici qu'a les poser. Le cout ne depend
   plus du nombre de boutiques deja chargees.
   */
  func updateRows(_ u: HLRowsUpdateRecord) {
    let t0 = CACurrentMediaTime()
    let total = max(0, u.total)
    var next = shops
    if next.count > total { next.removeSubrange(total...) }
    for (i, record) in u.rows.enumerated() {
      let pos = u.start + i
      // Jamais de trou : une rangee au-dela de la fin connue est ignoree.
      guard pos < total, pos <= next.count else { break }
      let shop = HLShop(record)
      if pos < next.count { next[pos] = shop } else { next.append(shop) }
    }
    shops = next
    hasMore = u.hasMore
    ghostCount = max(0, u.ghostCount)
    footerText = u.footerText
    footerIsEmpty = u.footerIsEmpty
    listLoading = u.loading
    lastPatch = (u.rows.count, (CACurrentMediaTime() - t0) * 1000)
    applyProps()
  }

  // MARK: - Application des props

  /** Appele a chaque lot de props (`OnViewDidUpdateProps`) et apres `updateRows`. */
  func applyProps() {
    var next: [HLRowContent] = shops.map { .shop($0) }
    // Fantomes : en queue quand une page suit, ou seuls pendant la premiere page.
    if (hasMore && !shops.isEmpty) || (shops.isEmpty && listLoading) {
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
    snap.appendItems(next.enumerated().map { Item.row(position: $0.offset, design: $0.element.design) },
                     toSection: .rows)
    if footerText != nil { snap.appendItems([.footer], toSection: .footer) }

    // Reconfigurer SEULEMENT ce qui a change (fantome rempli, boutique mise a
    // jour par socket, heure de livraison...) et qui existe AVANT comme APRES.
    // ⚠️ UIKit leve une exception (crash) si on reconfigure un item absent du
    // nouveau snapshot : pied de liste retire au retour de `hasMore`, banniere
    // retiree, rangee dont le design a change.
    let old = dataSource.snapshot()
    let fresh = snap
    let kept = { (item: Item) in old.indexOfItem(item) != nil && fresh.indexOfItem(item) != nil }
    var changed: [Item] = []
    for (pos, content) in next.enumerated() where pos < previous.count && previous[pos] != content {
      let item = Item.row(position: pos, design: content.design)
      if kept(item) { changed.append(item) }
    }
    if bannersChanged, kept(.banner) { changed.append(.banner) }
    if kept(.footer) { changed.append(.footer) }
    if !changed.isEmpty { snap.reconfigureItems(changed) }

    let t0 = CACurrentMediaTime()
    dataSource.apply(snap, animatingDifferences: false)
    // Sonde : cout d'une arrivee de page (remplissage des fantomes, ajout en
    // queue), mesure pendant ou hors geste.
    if next.count != previous.count || changed.contains(where: { if case .row = $0 { return true }; return false }) {
      let applyMs = ((CACurrentMediaTime() - t0) * 10_000).rounded() / 10
      var report: [String: Any] = [
        "kind": "apply",
        "applyMs": applyMs,
        "rowsBefore": previous.count,
        "rowsAfter": next.count,
        "reconfigured": changed.count,
        "duringScroll": perf.isRunning,
      ]
      if let p = lastPatch {
        report["patchRows"] = p.rows
        report["patchMs"] = (p.ms * 10).rounded() / 10
      }
      onDiagnostics(report)
    }
    lastPatch = nil
    // Fin du chargement sans boutique : la banniere attendait peut-etre la liste.
    tryOpenFirstGate()
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
    // Squelettes de la premiere page : elle est deja demandee par le home.
    guard hasMore, !shops.isEmpty, let firstGhost = rows.firstIndex(where: {
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
    // Sans boutique ET sans chargement seulement : sinon la banniere sortirait
    // avant que la premiere boutique (et ses images) soit arrivee.
    guard (firstShopReady || (!hasShop && !listLoading)) && (bannerReady || !needsBanner) else { return }
    firstGateOpen = true
    if let c = firstShopCell { revealShop(c) }
    bannerCell?.reveal(animated: true)
  }
}
