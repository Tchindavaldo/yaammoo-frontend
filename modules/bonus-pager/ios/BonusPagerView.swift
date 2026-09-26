import ExpoModulesCore
import UIKit

/**
 Carrousel natif de la sheet Bonus : UNE vue qui possede le defilement ET le
 pied de page.

 - Les cartes sont des composants React, enfants de cette vue. Au lieu d'etre
   poses sur la vue, ils sont montes dans la piste d'un `UIScrollView` pagine
   (`mountChildComponentView`), comme le fait le ScrollView de React Native.
   Leur position (page N a `N x largeur`) vient de Yoga, cote JS.
 - Le pied de page (galerie + panneau heros) est en UIKit et mis a jour dans
   `scrollViewDidScroll`, donc dans la MEME image que le defilement : aucun
   aller-retour JS, aucun decalage possible avec le doigt.

 Pendant le geste, React ne fait rien : les cartes glissent avec la piste.
 */
// ⚠️ `internal`, pas `public` : une classe publique devrait declarer `public`
// ses methodes de delegue UIKit. Le module l'utilise dans son propre binaire.
final class BonusPagerView: ExpoView, UIScrollViewDelegate {
  // Props, appliquees ensemble dans `applyProps`.
  var items: [BPItem] = []
  var footerHeight: CGFloat = 0
  var textColor: UIColor = .black
  var iconFontFamily: String?

  private let scroll = UIScrollView()
  /** Piste des cartes React (le « content container » d'un ScrollView RN). */
  private let pages = UIView()
  private let footer = BPFooterView()
  private var shown: (items: [BPItem], text: UIColor, font: String?)?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    scroll.isPagingEnabled = true
    scroll.showsHorizontalScrollIndicator = false
    scroll.showsVerticalScrollIndicator = false
    scroll.alwaysBounceVertical = false
    scroll.contentInsetAdjustmentBehavior = .never
    scroll.scrollsToTop = false
    // Comme le ScrollView RN : les boutons des cartes repondent sans delai.
    scroll.delaysContentTouches = false
    scroll.delegate = self
    scroll.addSubview(pages)
    addSubview(scroll)
    addSubview(footer)
    footer.onSelect = { [weak self] index in self?.goTo(index) }
  }

  // MARK: - Cartes React

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    pages.insertSubview(childComponentView, at: index)
    updateContentSize()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
    updateContentSize()
  }

  // MARK: - Props

  func applyProps() {
    let changed = shown.map { $0.items != items || $0.text != textColor || $0.font != iconFontFamily } ?? true
    if changed {
      shown = (items, textColor, iconFontFamily)
      footer.configure(items: items, textColor: textColor, iconFontFamily: iconFontFamily)
    }
    setNeedsLayout()
  }

  // MARK: - Mise en page

  override func layoutSubviews() {
    super.layoutSubviews()
    let fh = max(0, min(footerHeight, bounds.height))
    let pageFrame = CGRect(x: 0, y: 0, width: bounds.width, height: bounds.height - fh)
    if scroll.frame != pageFrame {
      // Largeur changee : on garde la page courante, pas l'offset en points.
      let page = currentPage
      scroll.frame = pageFrame
      updateContentSize()
      scroll.contentOffset = CGPoint(x: CGFloat(page) * pageFrame.width, y: 0)
    }
    footer.frame = CGRect(x: 0, y: bounds.height - fh, width: bounds.width, height: fh)
    footer.isHidden = fh <= 0
    sync()
  }

  private var currentPage: Int {
    let w = scroll.bounds.width
    guard w > 0 else { return 0 }
    return max(0, Int((scroll.contentOffset.x / w).rounded()))
  }

  private func updateContentSize() {
    let count = max(items.count, pages.subviews.count)
    let size = CGSize(width: scroll.bounds.width * CGFloat(count), height: scroll.bounds.height)
    pages.frame = CGRect(origin: .zero, size: size)
    if scroll.contentSize != size { scroll.contentSize = size }
  }

  // MARK: - Defilement

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    sync()
  }

  func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    cancelReactTouches()
  }

  /** Pied de page cale sur la position EXACTE du scroll (fractionnaire). */
  private func sync() {
    let w = scroll.bounds.width
    guard w > 0 else { return }
    footer.sync(position: scroll.contentOffset.x / w)
  }

  /** Tap sur une mini-carte : le pied de page suit l'animation image par image. */
  func goTo(_ index: Int) {
    let w = scroll.bounds.width
    guard w > 0, !items.isEmpty else { return }
    let i = max(0, min(items.count - 1, index))
    scroll.setContentOffset(CGPoint(x: CGFloat(i) * w, y: 0), animated: true)
  }

  /**
   Un glissement commence : le bouton de carte sous le doigt ne doit pas
   recevoir l'appui. Le ScrollView RN obtient ca cote JS (il prend la main sur
   le toucher) ; ici on coupe puis relance le gestionnaire de toucher de
   React, qui envoie alors « annule » aux composants touches.
   */
  private func cancelReactTouches() {
    var view: UIView? = superview
    while let current = view {
      for recognizer in current.gestureRecognizers ?? []
      where NSStringFromClass(type(of: recognizer)).contains("TouchHandler") {
        recognizer.isEnabled = false
        recognizer.isEnabled = true
        return
      }
      view = current.superview
    }
  }
}
