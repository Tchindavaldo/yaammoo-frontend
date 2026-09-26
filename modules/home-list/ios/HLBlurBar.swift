import CoreImage
import UIKit

/**
 Barre floutee du bas des cartes 4 et 5 : `BlurView intensity=60 tint=light`
 + voile blanc. Deux rendus, choisis par la prop `cardBlurMode` (JS, donc
 basculable par OTA pour comparer sur le meme telephone) :

 - `live` : `UIVisualEffectView`, le flou systeme (celui que posait deja
   expo-blur). Le serveur de rendu d'iOS le recalcule a CHAQUE image, pour
   chaque carte visible. Suspect de la double micro-pause du premier scroll :
   la 2e boutique (design 4) est la premiere a en porter, et ses barres sont
   juste sous le bord de l'ecran au lancement.
 - `baked` : derriere la barre il n'y a que la photo de SA carte, immobile par
   rapport a elle. On floute donc la photo une seule fois, en petit, hors du
   fil de l'ecran (cache par URL), puis on l'affiche comme une image
   ordinaire, calee sur la photo de la carte. Plus aucun flou a l'affichage.

 Les sous-vues de la barre vont dans `contentView`, quel que soit le rendu.
 */
final class HLBlurBar: UIView {
  enum Mode: String { case live, baked }

  /** Rendu courant (prop `cardBlurMode`), recu au montage avant les cellules. */
  static var mode: Mode = .baked

  /** Voile du flou systeme : `rgba(255,255,255,0.55)` du design. */
  private static let liveVeil: CGFloat = 0.55
  /**
   Voile du rendu `baked`. Le materiau `ultraThinLight` pose son propre voile
   clair sur le flou ; la photo floutee n'en a pas, d'ou un cran au-dessus.
   */
  private static let bakedVeil: CGFloat = 0.62
  /** Largeur (px) de la photo reduite avant le flou, et force du flou (px). */
  private static let bakeWidth: CGFloat = 64
  private static let bakeSigma: Double = 3

  private static let cache: NSCache<NSString, UIImage> = {
    let c = NSCache<NSString, UIImage>()
    c.countLimit = 400
    return c
  }()
  private static let queue = DispatchQueue(label: "yaammoo.homelist.blurbake", qos: .utility)
  /** Rendu logiciel : flouter une vignette de 64 px ne doit pas occuper le GPU pendant le scroll. */
  private static let ciContext = CIContext(options: [.useSoftwareRenderer: true])

  /** Sonde : photos floutees depuis le lancement et la plus longue (ms, hors fil de l'ecran). */
  private(set) static var bakes = 0
  private(set) static var bakeMaxMs: Double = 0

  let contentView = UIView()
  /**
   Cadre de la photo de la carte, dans le repere de la barre : la photo floutee
   y est posee pour que chaque zone floutee tombe sur la zone nette d'origine.
   */
  var photoFrame: CGRect = .zero {
    didSet { if photoFrame != oldValue { setNeedsLayout() } }
  }

  private var effect: UIVisualEffectView?
  private let backdrop = UIImageView()
  private let veil = UIView()
  private var photoKey: String?

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    clipsToBounds = true
    backdrop.contentMode = .scaleAspectFill
    addSubview(backdrop)
    addSubview(veil)
    addSubview(contentView)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  override func layoutSubviews() {
    super.layoutSubviews()
    applyMode()
    effect?.frame = bounds
    backdrop.frame = photoFrame
    veil.frame = bounds
    contentView.frame = bounds
  }

  private func applyMode() {
    let live = HLBlurBar.mode == .live
    if live && effect == nil {
      let v = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialLight))
      v.isUserInteractionEnabled = false
      insertSubview(v, at: 0)
      effect = v
    }
    effect?.isHidden = !live
    backdrop.isHidden = live
    veil.backgroundColor = UIColor(white: 1, alpha: live ? HLBlurBar.liveVeil : HLBlurBar.bakedVeil)
  }

  /**
   Photo de la carte (rendu `baked`). `key` = son URL : une photo n'est
   floutee qu'une fois pour toute la liste. `nil` = pas de photo, voile seul.
   */
  func setPhoto(_ photo: UIImage?, key: String?) {
    photoKey = key
    guard HLBlurBar.mode == .baked, let key = key, let photo = photo else {
      backdrop.image = nil
      return
    }
    if let done = HLBlurBar.cache.object(forKey: key as NSString) {
      backdrop.image = done
      return
    }
    backdrop.image = nil
    HLBlurBar.queue.async {
      let t0 = CACurrentMediaTime()
      let blurred = HLBlurBar.bake(photo)
      let ms = ((CACurrentMediaTime() - t0) * 10_000).rounded() / 10
      DispatchQueue.main.async { [weak self] in
        HLBlurBar.bakes += 1
        HLBlurBar.bakeMaxMs = max(HLBlurBar.bakeMaxMs, ms)
        if let b = blurred { HLBlurBar.cache.setObject(b, forKey: key as NSString) }
        // Cellule reutilisee entre-temps pour une autre photo : on n'y touche pas.
        guard let self = self, self.photoKey == key else { return }
        self.backdrop.image = blurred
      }
    }
  }

  /** Reduit la photo a `bakeWidth` px de large, puis la floute. Hors fil de l'ecran. */
  private static func bake(_ photo: UIImage) -> UIImage? {
    guard let cg = photo.cgImage, cg.width > 0, cg.height > 0 else { return nil }
    let w = Int(bakeWidth)
    let h = max(1, Int((CGFloat(cg.height) * bakeWidth / CGFloat(cg.width)).rounded()))
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
    ctx.interpolationQuality = .medium
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
    guard let small = ctx.makeImage() else { return nil }
    let input = CIImage(cgImage: small)
    // Bords etires avant le flou : sans ca, il tirerait le noir du dehors.
    let output = input.clampedToExtent().applyingGaussianBlur(sigma: bakeSigma).cropped(to: input.extent)
    guard let result = ciContext.createCGImage(output, from: input.extent) else { return nil }
    return UIImage(cgImage: result)
  }
}
