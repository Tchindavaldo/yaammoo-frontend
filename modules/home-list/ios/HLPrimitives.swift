import SDWebImage
import UIKit

// MARK: - Squelette

/**
 Squelette « qui respire » : fondu entre `#e6eaef` et `#f4f7fa` (800 ms aller,
 800 ms retour), comme `ShopSkeleton`/`CardSkeleton`. L'animation est une
 `CABasicAnimation` sur l'opacite d'un calque clair : elle tourne dans le
 serveur de rendu, sans aucun travail par frame sur le thread principal.
 */
final class HLSkeletonView: UIView {
  private let highlight = UIView()
  private var wantsBreathing = false

  init(radius: CGFloat) {
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    backgroundColor = HLColor.skeletonBase
    layer.cornerRadius = radius
    layer.cornerCurve = .continuous
    clipsToBounds = true
    highlight.backgroundColor = HLColor.skeletonHighlight
    highlight.alpha = 0
    highlight.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(highlight)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  override func layoutSubviews() {
    super.layoutSubviews()
    highlight.frame = bounds
  }

  func setBreathing(_ on: Bool) {
    wantsBreathing = on
    if on { addBreathIfNeeded() } else { highlight.layer.removeAnimation(forKey: "breath") }
  }

  // Les animations Core Animation sont retirees quand la vue quitte l'ecran
  // (ou l'app passe en arriere-plan) : on les repose au retour.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil && wantsBreathing { addBreathIfNeeded() }
  }

  private func addBreathIfNeeded() {
    guard highlight.layer.animation(forKey: "breath") == nil else { return }
    let a = CABasicAnimation(keyPath: "opacity")
    a.fromValue = 0
    a.toValue = 1
    a.duration = 0.8
    a.autoreverses = true
    a.repeatCount = .infinity
    a.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    highlight.layer.add(a, forKey: "breath")
  }
}

// MARK: - Degrade

final class HLGradientView: UIView {
  override class var layerClass: AnyClass { CAGradientLayer.self }
  var gradient: CAGradientLayer { layer as! CAGradientLayer }

  init(colors: [UIColor], locations: [NSNumber]? = nil,
       start: CGPoint = CGPoint(x: 0.5, y: 0), end: CGPoint = CGPoint(x: 0.5, y: 1)) {
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    gradient.colors = colors.map { $0.cgColor }
    gradient.locations = locations
    gradient.startPoint = start
    gradient.endPoint = end
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }
}

// MARK: - Pastille (texte sur fond arrondi)

/** Pastille a padding fixe : prix, frais de livraison, chips du header. */
final class HLPill: UIView {
  let label = UILabel()
  private let insets: UIEdgeInsets

  init(font: UIFont, textColor: UIColor, background: UIColor, radius: CGFloat,
       insets: UIEdgeInsets) {
    self.insets = insets
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    backgroundColor = background
    layer.cornerRadius = radius
    layer.cornerCurve = .continuous
    label.font = font
    label.textColor = textColor
    addSubview(label)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  override func sizeThatFits(_ size: CGSize) -> CGSize {
    let t = label.sizeThatFits(CGSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude))
    return CGSize(width: ceil(t.width) + insets.left + insets.right,
                  height: ceil(t.height) + insets.top + insets.bottom)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    label.frame = bounds.inset(by: insets)
  }
}

// MARK: - Icones (Ionicons de l'app, repli SF Symbols)

enum HLIcons {
  /** Renseigne par la prop `icons` : police Ionicons deja chargee par l'app. */
  static var fontFamily: String?
  static var glyphs: [String: String] = [:]

  /** Equivalents SF Symbols si la police n'est pas (encore) enregistree. */
  private static let symbols: [String: String] = [
    "flash": "bolt.fill",
    "star": "star.fill",
    "receipt-outline": "doc.text",
    "people-outline": "person.2",
  ]

  private static func iconFont(_ size: CGFloat) -> UIFont? {
    for name in [fontFamily, "Ionicons", "ionicons"].compactMap({ $0 }) {
      if let f = UIFont(name: name, size: size) { return f }
    }
    return nil
  }

  /** L'icone sous forme de texte attribue, inserable dans un `UILabel`. */
  static func attributed(_ name: String, size: CGFloat, color: UIColor) -> NSAttributedString {
    if let glyph = glyphs[name], let font = iconFont(size) {
      return NSAttributedString(string: glyph, attributes: [.font: font, .foregroundColor: color])
    }
    let config = UIImage.SymbolConfiguration(pointSize: size * 0.85, weight: .semibold)
    guard let image = UIImage(systemName: symbols[name] ?? "circle", withConfiguration: config)?
      .withTintColor(color, renderingMode: .alwaysOriginal) else {
      return NSAttributedString(string: "")
    }
    let attachment = NSTextAttachment()
    attachment.image = image
    attachment.bounds = CGRect(x: 0, y: -1, width: image.size.width, height: image.size.height)
    return NSAttributedString(attachment: attachment)
  }
}

/** Assemble des fragments (texte et icones) en un seul texte attribue. */
func HLText(_ parts: [NSAttributedString]) -> NSAttributedString {
  let out = NSMutableAttributedString()
  parts.forEach { out.append($0) }
  return out
}

/** Ajoute un espacement `gap` apres le fragment (equivalent du `gap` RN). */
func HLKerned(_ s: NSAttributedString, _ gap: CGFloat) -> NSAttributedString {
  let m = NSMutableAttributedString(attributedString: s)
  if m.length > 0 {
    m.addAttribute(.kern, value: gap, range: NSRange(location: m.length - 1, length: 1))
  }
  return m
}

func HLRun(_ text: String, _ font: UIFont, _ color: UIColor, kern: CGFloat = 0) -> NSAttributedString {
  var attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
  if kern != 0 { attrs[.kern] = kern }
  return NSAttributedString(string: text, attributes: attrs)
}

// MARK: - Barre floutee (bas des cartes 4 et 5)

/**
 `BlurView intensity=60 tint=light` + voile `rgba(255,255,255,0.55)`. Materiau
 systeme fixe plutot qu'un `UIViewPropertyAnimator` en pause (technique
 d'expo-blur) : ces animateurs se perdent au recyclage des cellules et au
 passage en arriere-plan. Le voile blanc a 55 % domine de toute facon le rendu.
 */
func HLMakeBlurBar() -> UIVisualEffectView {
  let v = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialLight))
  v.isUserInteractionEnabled = false
  v.clipsToBounds = true
  v.contentView.backgroundColor = UIColor(white: 1, alpha: 0.55)
  return v
}

// MARK: - Images

/**
 Chargement via SDWebImage, le moteur d'expo-image : meme cache memoire et
 disque que le reste de l'app. Les images sont reduites a la taille affichee
 (`imageThumbnailPixelSize`) : decodage plus court et memoire bornee.
 */
enum HLImage {
  static func url(_ s: String?) -> URL? {
    guard let s = s, !s.isEmpty else { return nil }
    return URL(string: s)
  }

  static func context(for size: CGSize) -> [SDWebImageContextOption: Any] {
    let scale = UIScreen.main.scale
    return [.imageThumbnailPixelSize: CGSize(width: size.width * scale, height: size.height * scale)]
  }

  /** Vrai si l'image est deja decodee en memoire : affichage immediat, sans squelette. */
  static func isInMemory(_ s: String?, size: CGSize) -> Bool {
    guard let u = url(s) else { return true }
    let key = SDWebImageManager.shared.cacheKey(for: u, context: context(for: size))
    return SDImageCache.shared.imageFromMemoryCache(forKey: key) != nil
  }

  static func set(_ view: UIImageView, _ s: String?, size: CGSize,
                  completion: (() -> Void)? = nil) {
    guard let u = url(s) else {
      view.sd_cancelCurrentImageLoad()
      view.image = nil
      completion?()
      return
    }
    view.sd_setImage(with: u, placeholderImage: nil, options: [.retryFailed],
                     context: context(for: size), progress: nil) { _, _, _, _ in
      completion?()
    }
  }

  /**
   Charge sans afficher (temoin de revelation, prefetch) : meme cle de cache que
   `set`, donc la requete est partagee avec l'image affichee.
   */
  @discardableResult
  static func fetch(_ s: String?, size: CGSize, completion: @escaping () -> Void) -> SDWebImageCombinedOperation? {
    guard let u = url(s) else {
      completion()
      return nil
    }
    return SDWebImageManager.shared.loadImage(with: u, options: [.retryFailed],
                                              context: context(for: size), progress: nil) { _, _, _, _, _, _ in
      completion()
    }
  }

  static func prefetch(_ items: [(String?, CGSize)]) {
    for (s, size) in items {
      guard let u = url(s) else { continue }
      _ = SDWebImagePrefetcher.shared.prefetchURLs([u], options: [.retryFailed],
                                               context: context(for: size), progress: nil, completed: nil)
    }
  }
}
