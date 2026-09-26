import Metal
import QuartzCore
import UIKit

/**
 Sonde de l'ECRAN, complement de `HLPerfMonitor`.

 Le CADisplayLink de `HLPerfMonitor` ne voit que le fil principal de l'app :
 si l'app finit son image a temps mais que le serveur de rendu d'iOS la
 compose en retard (flou, calques hors ecran...), il ne voit rien. C'est le
 cas de la double micro-pause du premier scroll : 0 image perdue cote app.

 Ici, un calque Metal d'UN pixel (blanc, sur la marge blanche de la liste)
 recoit une image a chaque frame du geste. `presentedTime` donne l'heure
 REELLE ou elle est apparue a l'ecran : un ecart > 1,5 frame entre deux
 affichages = image perdue a l'ecran, quelle qu'en soit la cause.

 Le dessin part sur un fil a part : `nextDrawable` peut attendre quand
 l'ecran est en retard, et cette attente ne doit jamais toucher le scroll.
 */
final class HLScreenProbe {
  let layer = CAMetalLayer()
  private let commandQueue: MTLCommandQueue?
  private let work = DispatchQueue(label: "yaammoo.homelist.screenprobe", qos: .userInteractive)
  /** Geste en cours (fil principal uniquement). */
  private var session: Session?

  init() {
    let device = MTLCreateSystemDefaultDevice()
    commandQueue = device?.makeCommandQueue()
    layer.device = device
    layer.pixelFormat = .bgra8Unorm
    layer.framebufferOnly = true
    layer.isOpaque = true
    layer.backgroundColor = UIColor.white.cgColor
    layer.drawableSize = CGSize(width: 1, height: 1)
    let px = 1 / UIScreen.main.scale
    layer.frame = CGRect(x: 0, y: 0, width: px, height: px)
  }

  /**
   Premier affichage a vide, hors geste : l'amorcage de Metal ne doit pas
   tomber dans le premier geste, celui qu'on cherche justement a mesurer.
   */
  func warmUp() {
    guard commandQueue != nil else { return }
    work.async { [weak self] in self?.present(nil, offset: 0) }
  }

  func begin(expected: CFTimeInterval) {
    guard commandQueue != nil else { return }
    session = Session(start: CACurrentMediaTime(), expected: expected)
  }

  /** Une image par tick du geste ; `offset` = position du scroll a cet instant. */
  func frame(offset: CGFloat, expected: CFTimeInterval) {
    guard let s = session else { return }
    s.expected = expected
    work.async { [weak self] in self?.present(s, offset: offset) }
  }

  /** Clot le geste. Ses derniers affichages arrivent encore quelques ms apres. */
  func end() -> Session? {
    defer { session = nil }
    return session
  }

  private func present(_ s: Session?, offset: CGFloat) {
    guard let queue = commandQueue, let drawable = layer.nextDrawable(),
          let buffer = queue.makeCommandBuffer() else {
      if let s = s { DispatchQueue.main.async { s.skipped += 1 } }
      return
    }
    let pass = MTLRenderPassDescriptor()
    pass.colorAttachments[0].texture = drawable.texture
    pass.colorAttachments[0].loadAction = .clear
    pass.colorAttachments[0].storeAction = .store
    pass.colorAttachments[0].clearColor = MTLClearColor(red: 1, green: 1, blue: 1, alpha: 1)
    buffer.makeRenderCommandEncoder(descriptor: pass)?.endEncoding()
    if let s = s {
      drawable.addPresentedHandler { d in
        let t = d.presentedTime
        DispatchQueue.main.async { s.record(presentedAt: t, offset: offset) }
      }
    }
    buffer.present(drawable)
    buffer.commit()
  }

  /** Mesures d'un geste, cote ecran. Fil principal uniquement. */
  final class Session {
    let start: CFTimeInterval
    var expected: CFTimeInterval
    var skipped = 0
    private var last: CFTimeInterval = 0
    private var frames = 0
    private var dropped = 0
    private var hitches = 0
    private var worst: CFTimeInterval = 0
    /** Premieres pertes : [ms depuis le debut du geste, ecart ms, offsetY]. */
    private var drops: [[Double]] = []

    init(start: CFTimeInterval, expected: CFTimeInterval) {
      self.start = start
      self.expected = expected
    }

    func record(presentedAt t: CFTimeInterval, offset: CGFloat) {
      // 0 = image remplacee avant d'avoir ete affichee ; l'ecart suivant la compte.
      guard t > 0, t > last else { return }
      if last > 0 {
        let dt = t - last
        frames += 1
        if dt > expected * 1.5 {
          dropped += max(1, Int((dt / expected).rounded()) - 1)
          if drops.count < 6 { drops.append([ms(t - start), ms(dt), Double(Int(offset))]) }
        }
        if dt > 0.05 { hitches += 1 }
        worst = max(worst, dt)
      }
      last = t
    }

    var report: [String: Any] {
      [
        "screenFrames": frames,
        "screenDropped": dropped,
        "screenHitches": hitches,
        "screenWorstMs": ms(worst),
        "screenSkipped": skipped,
        "screenDrops": drops,
      ]
    }

    private func ms(_ s: CFTimeInterval) -> Double { (s * 10_000).rounded() / 10 }
  }
}
