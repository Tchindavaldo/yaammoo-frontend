import UIKit

/**
 Revelation de la liste « Tout » (sortie de `HomeListView.swift`, R4) : delegues
 des cellules, porte banniere + premiere boutique, et retour sur « Tout ».

 Normalement : la banniere sort AVEC la premiere boutique, les autres boutiques
 sortent des que leurs images sont la, une boutique deja vue reapparait sans
 squelette.

 Apres `resetReveal()` (tab categorie ouvert, la liste est masquee dessous) :
 TOUT repasse par la porte, images en memoire comprises, puis les boutiques
 sortent en fondu DU HAUT VERS LE BAS (`pump`), jamais une rangee du bas avant
 celle du dessus. Une fois l'ecran sorti, retour au comportement normal.
 */
extension HomeListView {

  // MARK: - Retour sur « Tout »

  /**
   Remise a zero de la revelation, liste en haut. Les squelettes viennent des
   donnees masquees envoyees par JS (`updateRows` vide + `bannerLoading`).
   */
  func resetReveal() {
    holdReveal = true
    revealedShops.removeAll()
    firstGateOpen = false
    bannerReady = false
    firstShopReady = false
    firstShopCell = nil
    preheater.stop(reason: "reset")
    collection.setContentOffset(CGPoint(x: 0, y: -collection.adjustedContentInset.top), animated: false)
  }

  var holdsReveal: Bool { holdReveal }

  /**
   Sort les boutiques pretes dans l'ordre des positions, et s'arrete a la
   premiere a l'ecran qui ne l'est pas encore. Une rangee entierement au-dessus
   de l'ecran ne bloque pas celles du dessous.
   */
  func pump() {
    guard holdReveal, firstGateOpen, let cv = collection else { return }
    let top = cv.contentOffset.y
    var allOut = true
    let cells = cv.visibleCells.compactMap { $0 as? HLShopCell }.sorted { $0.position < $1.position }
    for c in cells where c.isShop && !c.revealed {
      if !c.ready {
        allOut = false
        if c.frame.maxY <= top { continue }
        break
      }
      revealShop(c)
    }
    if allOut { holdReveal = false }
  }

  /**
   Rangee prete devenue visible sans passer par `pump` (preparee hors ecran
   pendant le retour) : elle sort a son entree a l'ecran.
   */
  func revealIfWaiting(_ cell: HLShopCell) {
    guard firstGateOpen, !holdReveal, cell.isShop, cell.ready, !cell.revealed else { return }
    revealShop(cell)
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
    // Tour suivant : la rangee est configuree PENDANT la mise en page, elle
    // n'est pas encore dans `visibleCells`.
    if holdReveal {
      DispatchQueue.main.async { [weak self] in self?.pump() }
      return
    }
    revealShop(cell)
  }

  func revealShop(_ cell: HLShopCell) {
    if case .shop(let s)? = cell.content { revealedShops.insert(s.id) }
    if !cell.revealed { perf.mark("reveal\(cell.position)") }
    cell.reveal(animated: true)
  }

  func savedMenuOffset(_ shopId: String) -> CGFloat { menuOffsets[shopId] ?? 0 }
  func saveMenuOffset(_ x: CGFloat, shopId: String) { menuOffsets[shopId] = x }

  // MARK: - HLBannerCellDelegate

  func bannerTapped(_ bannerId: String) {
    onBannerPress(["id": bannerId])
  }

  func bannerAutoplay(_ cell: HLBannerCell) {
    perf.mark("banner")
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
  func tryOpenFirstGate() {
    guard !firstGateOpen else { return }
    let hasShop = rows.contains { if case .shop = $0 { return true } else { return false } }
    let needsBanner = !shownBanners.isEmpty
    // Sans boutique ET sans chargement seulement : sinon la banniere sortirait
    // avant que la premiere boutique (et ses images) soit arrivee.
    guard (firstShopReady || (!hasShop && !listLoading)) && (bannerReady || !needsBanner) else { return }
    firstGateOpen = true
    if holdReveal {
      DispatchQueue.main.async { [weak self] in self?.pump() }
    } else if let c = firstShopCell {
      revealShop(c)
    }
    bannerCell?.reveal(animated: true)
    // Rangees sous l'ecran creees au repos, une fois le fondu termine.
    preheater.schedule(after: HLLayout.revealDuration + 0.1)
  }
}
