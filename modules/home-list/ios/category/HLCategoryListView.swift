import ExpoModulesCore
import UIKit

/**
 Liste native des tabs CATEGORIE du home : banniere, rangees de plats (grille),
 fantomes de la page suivante, pied de liste, dans UNE `UICollectionView`.

 SEPAREE de la liste « Tout » (`HomeListView`) : autre vue, autre etat, autres
 cellules. Un souci ici ne touche jamais « Tout », et inversement.

 Revelation, a CHAQUE changement de tab (`feedKey`) :
 - banniere ET rangees repassent en squelette, liste remontee en haut ;
 - la porte s'ouvre quand la banniere et la PREMIERE rangee sont pretes, puis
   `HLCLayout.revealHold` plus tard (pas de flash) ;
 - ensuite les rangees sortent DANS L'ORDRE, du haut vers le bas : une rangee
   prete attend celle du dessus (jamais le bas affiche et le haut en squelette).
 */
final class HLCategoryListView: ExpoView, UICollectionViewDelegateFlowLayout,
  UICollectionViewDataSourcePrefetching, HLCategoryRowCellDelegate, HLCategoryBannerCellDelegate {

  let onMenuPress = EventDispatcher()
  let onBannerPress = EventDispatcher()
  let onEndReached = EventDispatcher()
  let onRefresh = EventDispatcher()

  enum Section: Int { case banner, rows, footer }
  enum Item: Hashable {
    case banner
    case row(Int)
    case footer
  }

  /** Reference faible vers une rangee configuree (registre par position). */
  private struct WeakRow { weak var cell: HLCategoryRowCell? }

  // Props.
  var banners: [HLCBanner] = []
  var prefetchDistance: CGFloat = 1200
  var bottomInset: CGFloat = 0 { didSet { updateInsets() } }
  var refreshing = false { didSet { if !refreshing && refresher.isRefreshing { refresher.endRefreshing() } } }

  // Donnees (`updateRows`).
  private var feedKey: String?
  /** Numero du tab affiche : tout rappel d'un tab precedent est ignore. */
  private var epoch = 0
  private var dishRows: [HLCRow] = []
  private var hasMore = false
  private var ghostCount = 3
  private var footerText: String?
  private var footerIsEmpty = false
  /** VRAI par defaut : squelettes des le montage, avant la premiere page. */
  private var listLoading = true

  private var collection: UICollectionView!
  private var dataSource: UICollectionViewDiffableDataSource<Section, Item>!
  private let refresher = UIRefreshControl()
  private var rows: [HLCRowContent] = []
  private var shownBanners: [HLCBanner] = []
  /** Nouveau tab : toutes les cellules presentes sont reconfigurees. */
  private var forceReconfigure = false

  // Revelation (remise a zero a chaque tab).
  private var gateOpen = false
  private var gateScheduled = false
  private var bannerReady = false
  private var revealedIds = Set<String>()
  private var cells: [Int: WeakRow] = [:]
  private weak var bannerCell: HLCategoryBannerCell?

  private var fetchArmed = true

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .white
    setupCollection()
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
    cv.register(HLCategoryBannerCell.self, forCellWithReuseIdentifier: HLCategoryBannerCell.reuseId)
    cv.register(HLCategoryRowCell.self, forCellWithReuseIdentifier: HLCategoryRowCell.reuseId)
    cv.register(HLCategoryFooterCell.self, forCellWithReuseIdentifier: HLCategoryFooterCell.reuseId)
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
      let c = cv.dequeueReusableCell(withReuseIdentifier: HLCategoryBannerCell.reuseId,
                                     for: indexPath) as! HLCategoryBannerCell
      c.delegate = self
      bannerCell = c
      c.configure(banners: shownBanners, epoch: epoch, gateOpen: gateOpen)
      return c
    case .row(let pos):
      let c = cv.dequeueReusableCell(withReuseIdentifier: HLCategoryRowCell.reuseId,
                                     for: indexPath) as! HLCategoryRowCell
      c.delegate = self
      if pos < rows.count {
        cells[pos] = WeakRow(cell: c)
        let content = rows[pos]
        var already = false
        if case .dishes(let r) = content { already = gateOpen && revealedIds.contains(r.id) }
        c.configure(content, position: pos, alreadyRevealed: already)
      }
      return c
    case .footer:
      let c = cv.dequeueReusableCell(withReuseIdentifier: HLCategoryFooterCell.reuseId,
                                     for: indexPath) as! HLCategoryFooterCell
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

  // MARK: - Donnees

  func updateRows(_ u: HLCUpdateRecord) {
    if u.feedKey != feedKey { resetFeed(u.feedKey) }
    let total = max(0, u.total)
    var next = dishRows
    if next.count > total { next.removeSubrange(total...) }
    for (i, record) in u.rows.enumerated() {
      let pos = u.start + i
      // Jamais de trou : une rangee au-dela de la fin connue est ignoree.
      guard pos < total, pos <= next.count else { break }
      let row = HLCRow(record)
      if pos < next.count { next[pos] = row } else { next.append(row) }
    }
    dishRows = next
    hasMore = u.hasMore
    ghostCount = max(0, u.ghostCount)
    footerText = u.footerText
    footerIsEmpty = u.footerIsEmpty
    listLoading = u.loading
    apply()
  }

  /** Autre tab : on repart de zero, squelettes partout, haut de liste. */
  private func resetFeed(_ key: String) {
    feedKey = key
    epoch += 1
    dishRows = []
    gateOpen = false
    gateScheduled = false
    bannerReady = false
    revealedIds.removeAll()
    cells.removeAll()
    fetchArmed = true
    forceReconfigure = true
    collection.setContentOffset(CGPoint(x: 0, y: -collection.adjustedContentInset.top), animated: false)
  }

  /** Appele a chaque lot de props (`OnViewDidUpdateProps`) et apres `updateRows`. */
  func apply() {
    var next: [HLCRowContent] = dishRows.map { .dishes($0) }
    // Fantomes : en queue quand une page suit, ou seuls pendant la premiere page.
    if (hasMore && !dishRows.isEmpty) || (dishRows.isEmpty && listLoading) {
      next += Array(repeating: HLCRowContent.ghost, count: ghostCount)
    }
    let previous = rows
    let bannersChanged = banners != shownBanners
    if next.count != previous.count { fetchArmed = true }
    rows = next
    shownBanners = banners

    var snap = NSDiffableDataSourceSnapshot<Section, Item>()
    snap.appendSections([.banner, .rows, .footer])
    if !banners.isEmpty { snap.appendItems([.banner], toSection: .banner) }
    snap.appendItems(next.indices.map { Item.row($0) }, toSection: .rows)
    if footerText != nil { snap.appendItems([.footer], toSection: .footer) }

    // Reconfigurer SEULEMENT ce qui existe AVANT comme APRES (UIKit plante sur
    // un item absent du nouveau snapshot) et qui a change.
    let old = dataSource.snapshot()
    let fresh = snap
    let kept = { (item: Item) in old.indexOfItem(item) != nil && fresh.indexOfItem(item) != nil }
    var changed: [Item] = []
    for (pos, content) in next.enumerated() where pos < previous.count {
      guard forceReconfigure || previous[pos] != content else { continue }
      let item = Item.row(pos)
      if kept(item) { changed.append(item) }
    }
    if bannersChanged || forceReconfigure, kept(.banner) { changed.append(.banner) }
    if kept(.footer) { changed.append(.footer) }
    if !changed.isEmpty { snap.reconfigureItems(changed) }
    forceReconfigure = false

    dataSource.apply(snap, animatingDifferences: false)
    tryOpenGate()
    DispatchQueue.main.async { [weak self] in
      self?.checkEndReached()
      self?.pump()
    }
  }

  // MARK: - Revelation

  /** Premiere rangee prete (ou liste vide) + banniere prete : porte ouverte apres l'attente. */
  private func tryOpenGate() {
    guard !gateOpen, !gateScheduled else { return }
    let hasRows = !dishRows.isEmpty
    var firstReady = false
    if let c = cells[0]?.cell, c.position == 0, case .dishes = c.content { firstReady = c.ready }
    let needsBanner = !shownBanners.isEmpty
    guard (firstReady || (!hasRows && !listLoading)) && (bannerReady || !needsBanner) else { return }
    gateScheduled = true
    let e = epoch
    // Liste vide : rien a proteger d'un flash, le pied de liste sort tout de suite.
    let hold = hasRows ? HLCLayout.revealHold : 0
    DispatchQueue.main.asyncAfter(deadline: .now() + hold) { [weak self] in
      guard let self = self, self.epoch == e else { return }
      self.gateScheduled = false
      self.gateOpen = true
      self.bannerCell?.reveal(animated: true)
      self.pump()
    }
  }

  /**
   Revele les rangees pretes DANS L'ORDRE : du haut de l'ecran vers le bas, on
   s'arrete a la premiere qui n'est pas prete. Une rangee entierement au-dessus
   de l'ecran ne retient pas celles du dessous.
   */
  private func pump() {
    guard gateOpen, let cv = collection else { return }
    let top = cv.contentOffset.y
    let section = Section.rows.rawValue
    for pos in cells.keys.sorted() {
      guard let c = cells[pos]?.cell, c.position == pos, pos < rows.count else {
        cells[pos] = nil
        continue
      }
      if let f = cv.layoutAttributesForItem(at: IndexPath(item: pos, section: section))?.frame,
         f.maxY <= top { continue }
      if c.revealed { continue }
      guard c.ready, case .dishes(let r) = c.content else { break }
      revealedIds.insert(r.id)
      c.reveal(animated: true)
    }
  }

  // MARK: - Defilement

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    checkEndReached()
    pump()
  }

  func collectionView(_ cv: UICollectionView, willDisplay cell: UICollectionViewCell,
                      forItemAt indexPath: IndexPath) {
    if cell is HLCategoryRowCell { DispatchQueue.main.async { [weak self] in self?.pump() } }
  }

  /** Page suivante demandee quand le PREMIER fantome approche (`prefetchDistance`). */
  private func checkEndReached() {
    guard hasMore, !dishRows.isEmpty, let firstGhost = rows.firstIndex(of: .ghost) else { return }
    guard let attrs = collection.layoutAttributesForItem(
      at: IndexPath(item: firstGhost, section: Section.rows.rawValue)) else { return }
    let gap = attrs.frame.minY - (collection.contentOffset.y + bounds.height)
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
    case .banner: return CGSize(width: w, height: HLCLayout.bannerHeight)
    case .row: return CGSize(width: w, height: HLCLayout.rowHeight)
    case .footer: return CGSize(width: w, height: HLCategoryFooterCell.height(empty: footerIsEmpty))
    }
  }

  // MARK: - Prechargement des images des rangees a venir

  func collectionView(_ cv: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
    let size = CGSize(width: HLCLayout.card.width, height: HLCLayout.card.height)
    var items: [(String?, CGSize)] = []
    for ip in indexPaths {
      guard case .row(let pos)? = dataSource.itemIdentifier(for: ip), pos < rows.count,
            case .dishes(let r) = rows[pos] else { continue }
      for d in r.dishes.prefix(3) { items.append((d.image, size)) }
    }
    HLImage.prefetch(items)
  }

  // MARK: - HLCategoryRowCellDelegate

  func categoryRow(_ cell: HLCategoryRowCell, didTapDish dishId: String, rowId: String) {
    onMenuPress(["rowId": rowId, "dishId": dishId])
  }

  func categoryRowIsReady(_ cell: HLCategoryRowCell) {
    if gateOpen { pump() } else { tryOpenGate() }
  }

  // MARK: - HLCategoryBannerCellDelegate

  func categoryBannerTapped(_ bannerId: String) {
    onBannerPress(["id": bannerId])
  }

  func categoryBannerIsReady(_ cell: HLCategoryBannerCell, epoch e: Int) {
    guard e == epoch else { return }
    bannerReady = true
    bannerCell = cell
    if gateOpen { cell.reveal(animated: true) } else { tryOpenGate() }
  }
}

/** Pied de liste (fin de la categorie, ou categorie vide). Copie de `HLFooterCell`. */
final class HLCategoryFooterCell: UICollectionViewCell {
  static let reuseId = "category-footer"
  private let label = UILabel()
  private var empty = false

  static func height(empty: Bool) -> CGFloat { empty ? 240 : 64 }

  override init(frame: CGRect) {
    super.init(frame: frame)
    label.textAlignment = .center
    label.numberOfLines = 0
    contentView.addSubview(label)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(text: String, empty isEmpty: Bool) {
    empty = isEmpty
    label.text = text
    label.font = .systemFont(ofSize: isEmpty ? 16 : 13)
    label.textColor = HLColor.hex(isEmpty ? "#AEAEB2" : "#C7C7CC")
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    label.frame = empty
      ? contentView.bounds.insetBy(dx: 40, dy: 0)
      : contentView.bounds.insetBy(dx: 16, dy: 24)
  }
}
