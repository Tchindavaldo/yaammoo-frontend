import SDWebImage
import UIKit

protocol HLCategoryRowCellDelegate: AnyObject {
  func categoryRow(_ cell: HLCategoryRowCell, didTapDish dishId: String, rowId: String)
  /** Images de la rangee pretes (ou deja en memoire). La liste decide QUAND reveler. */
  func categoryRowIsReady(_ cell: HLCategoryRowCell)
}

/**
 Rangee de la liste categorie : N cartes plat en liste horizontale, sans
 en-tete boutique. Copie dediee (R16) de `HLShopCell`.

 La rangee ne se revele JAMAIS seule : elle signale `ready` (images des cartes
 visibles chargees, 8 s max) et la liste la revele dans l'ordre, du haut vers
 le bas (`HLCategoryListView.pump`).
 */
final class HLCategoryRowCell: UICollectionViewCell, UICollectionViewDataSource, UICollectionViewDelegate,
  UICollectionViewDataSourcePrefetching {
  static let reuseId = "category-row"

  weak var delegate: HLCategoryRowCellDelegate?
  private var cards: UICollectionView!
  private(set) var content: HLCRowContent = .ghost
  private(set) var position = -1
  /** Images pretes : la rangee PEUT sortir (la liste choisit le moment). */
  private(set) var ready = false
  private(set) var revealed = false
  private var generation = 0
  private var pending = Set<String>()
  private var ops: [SDWebImageCombinedOperation] = []
  private var timeout: DispatchWorkItem?

  private var cardSize: CGSize { CGSize(width: HLCLayout.card.width, height: HLCLayout.card.height) }

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.backgroundColor = .white
    let layout = UICollectionViewFlowLayout()
    layout.scrollDirection = .horizontal
    layout.minimumLineSpacing = HLCLayout.cardGap
    layout.minimumInteritemSpacing = 0
    layout.itemSize = CGSize(width: HLCLayout.card.width, height: HLCLayout.card.height + HLCLayout.metaHeight)
    let cv = UICollectionView(frame: .zero, collectionViewLayout: layout)
    cv.backgroundColor = .clear
    cv.showsHorizontalScrollIndicator = false
    cv.clipsToBounds = true
    cv.dataSource = self
    cv.delegate = self
    cv.prefetchDataSource = self
    cv.register(HLCategoryCardCell.self, forCellWithReuseIdentifier: HLCategoryCardCell.reuseId)
    contentView.addSubview(cv)
    cards = cv
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  private var row: HLCRow? {
    if case .dishes(let r) = content { return r }
    return nil
  }

  // MARK: Configuration

  /**
   `alreadyRevealed` : rangee deja sortie depuis le dernier changement de tab
   (retour par le scroll) : reaffichage direct, sans squelette.
   */
  func configure(_ c: HLCRowContent, position pos: Int, alreadyRevealed: Bool) {
    generation += 1
    cancelLoads()
    content = c
    position = pos
    switch c {
    case .ghost:
      ready = false
      revealed = false
    case .dishes(let r):
      let urls = revealUrls(r)
      revealed = alreadyRevealed
      ready = alreadyRevealed || urls.allSatisfy { HLImage.isInMemory($0, size: cardSize) }
      if !ready { waitFor(urls) }
    }
    cards.reloadData()
    cards.setContentOffset(.zero, animated: false)
    setNeedsLayout()
    if ready { delegate?.categoryRowIsReady(self) }
  }

  /** Images attendues : cartes visibles a l'ouverture de la rangee. */
  private func revealUrls(_ r: HLCRow) -> [String] {
    let width = max(bounds.width, UIScreen.main.bounds.width) - 2 * HLCLayout.sidePadding
    let visible = Int(ceil(width / (HLCLayout.card.width + HLCLayout.cardGap)))
    return r.dishes.prefix(visible).compactMap { d in
      guard let u = d.image, !u.isEmpty else { return nil }
      return u
    }
  }

  private func waitFor(_ urls: [String]) {
    let gen = generation
    pending = Set(urls)
    if pending.isEmpty {
      ready = true
      return
    }
    for u in urls {
      let op = HLImage.fetch(u, size: cardSize) { [weak self] in
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
    DispatchQueue.main.asyncAfter(deadline: .now() + HLCLayout.revealMaxWait, execute: work)
  }

  private func becameReady() {
    guard !ready else { return }
    timeout?.cancel()
    timeout = nil
    pending.removeAll()
    ready = true
    delegate?.categoryRowIsReady(self)
  }

  private func cancelLoads() {
    ops.forEach { $0.cancel() }
    ops.removeAll()
    timeout?.cancel()
    timeout = nil
    pending.removeAll()
  }

  // MARK: Revelation

  /** Appele par la liste, dans l'ordre des rangees (fondu 220 ms). */
  func reveal(animated: Bool) {
    guard row != nil, ready, !revealed else { return }
    revealed = true
    let changes = {
      for case let cell as HLCategoryCardCell in self.cards.visibleCells {
        cell.content.alpha = 1
        cell.skeletons.alpha = 0
      }
    }
    let gen = generation
    let done: (Bool) -> Void = { _ in
      guard self.revealed, self.generation == gen else { return }
      for case let cell as HLCategoryCardCell in self.cards.visibleCells { cell.setBreathing(false) }
    }
    if animated {
      UIView.animate(withDuration: HLCLayout.revealDuration, delay: 0,
                     options: [.curveEaseOut, .allowUserInteraction, .beginFromCurrentState],
                     animations: changes, completion: done)
    } else {
      changes()
      done(true)
    }
  }

  // MARK: Cycle de vie

  override func prepareForReuse() {
    super.prepareForReuse()
    generation += 1
    cancelLoads()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let pad = HLCLayout.sidePadding
    cards.frame = CGRect(x: pad, y: HLCLayout.rowTop, width: bounds.width - 2 * pad,
                         height: HLCLayout.card.height + HLCLayout.metaHeight)
  }

  // MARK: Cartes (liste horizontale)

  func collectionView(_ cv: UICollectionView, numberOfItemsInSection section: Int) -> Int {
    switch content {
    case .ghost: return HLCLayout.ghostCards
    case .dishes(let r): return r.dishes.count
    }
  }

  func collectionView(_ cv: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
    let cell = cv.dequeueReusableCell(withReuseIdentifier: HLCategoryCardCell.reuseId,
                                      for: indexPath) as! HLCategoryCardCell
    let dish = row.flatMap { indexPath.item < $0.dishes.count ? $0.dishes[indexPath.item] : nil }
    cell.configure(dish, revealed: revealed)
    return cell
  }

  func collectionView(_ cv: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
    guard let r = row else { return }
    HLImage.prefetch(indexPaths.filter { $0.item < r.dishes.count }.map { (r.dishes[$0.item].image, cardSize) })
  }

  func collectionView(_ cv: UICollectionView, shouldHighlightItemAt indexPath: IndexPath) -> Bool {
    row != nil
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
    guard let r = row, indexPath.item < r.dishes.count else { return }
    delegate?.categoryRow(self, didTapDish: r.dishes[indexPath.item].id, rowId: r.id)
  }
}
