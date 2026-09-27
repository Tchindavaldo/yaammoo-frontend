import QuartzCore
import UIKit

/**
 Sonde de fluidite de la liste native, pour les builds SANS terminal
 (TestFlight) : les rapports partent vers JS (`onDiagnostics`), qui les
 journalise et les transmet a Sentry.

 Mesure, pour chaque geste de scroll (du doigt pose a l'arret de l'elan) :
 images affichees, images perdues (intervalle > 1,5 x la cadence de l'ecran),
 accrocs (> 50 ms), pire intervalle, et le temps de configuration des
 rangees reutilisees pendant le geste. Ces chiffres-la ne voient que le fil
 principal ; `screen` (`HLScreenProbe`) mesure ce qui arrive vraiment a
 l'ecran (champs `screen*`).

 ⚠️ `dropped` lit l'heure des images (`timestamp`) : un fil principal occupe
 17 a 33 ms (UNE image perdue) ne decale pas cette heure, il ne compte que
 les retards de 2 images et plus. `mainBusy` mesure donc l'occupation reelle
 du fil principal (reveil → mise en veille de la boucle, commit compris).

 Mouvement : une pause ressentie SANS image perdue est un contenu qui
 s'arrete ou saute alors que les images arrivent a l'heure. Le deplacement
 par image est donc releve : `stalls` (image immobile en plein mouvement),
 `jumps` (saut brutal), et pour les premiers gestes le profil complet
 (`motion`) plus la chronologie de ce qui a change a l'ecran (`events`).
 */
final class HLPerfMonitor: NSObject {
  var onReport: (([String: Any]) -> Void)?
  /** Position du scroll, relevee a chaque image pour situer les pertes a l'ecran. */
  var offsetProvider: (() -> CGFloat)?
  let screen = HLScreenProbe()

  /** Gestes dont on envoie le profil complet (`motion`, `events`). */
  private static let detailedGestures = 3
  private static let maxMotion = 240
  /** Entrees / sorties de rangees comprises (`inN`, `outN`). */
  private static let maxEvents = 40
  /** Deplacement par image (points), dans l'ordre. */
  private var deltas: [CGFloat] = []
  private var lastOffset: CGFloat?
  /** Image ou le doigt s'est leve (debut de l'elan), -1 = pas d'elan. */
  private var fingerUpFrame = -1
  /** `[ms depuis le debut du geste, quoi, offsetY]`. */
  private var events: [[Any]] = []

  private var link: CADisplayLink?
  private var start: CFTimeInterval = 0
  private var last: CFTimeInterval = 0
  private var frames = 0
  private var dropped = 0
  private var hitches = 0
  private var worst: CFTimeInterval = 0
  private var configures = 0
  private var configureTotal: CFTimeInterval = 0
  private var configureMax: CFTimeInterval = 0
  private var expected: CFTimeInterval = 1.0 / 60
  /** Rang du geste depuis le lancement : 1 = le premier scroll. */
  private var gesture = 0

  /** Occupation du fil principal > `busyThreshold` : [ms depuis le debut, duree ms, offsetY]. */
  private static let busyThreshold: CFTimeInterval = 0.008
  private static let maxBusy = 8
  private var observer: CFRunLoopObserver?
  private var busySince: CFTimeInterval = 0
  private var busy: [[Double]] = []
  private var busyLong = 0
  private var busyMax: CFTimeInterval = 0

  /** Variante `preroll` : horloge et calque Metal lances au doigt pose, avant le geste. */
  private var prerolling = false
  private var prerollId = 0

  var isRunning: Bool { link != nil && !prerolling }

  /**
   Doigt pose (variante `preroll`) : l'horloge et le calque Metal tournent
   deja quand le geste commence. Si les pertes des images 2-3 du geste
   disparaissent, c'etait le redemarrage de la sonde, pas la liste.
   */
  func touchDown() {
    guard HLCellDiag.prerollsProbe, link == nil else { return }
    prerolling = true
    prerollId += 1
    let id = prerollId
    startLink()
    // Simple tape, sans geste : on arrete.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
      guard let self = self, self.prerolling, self.prerollId == id else { return }
      self.prerolling = false
      self.link?.invalidate()
      self.link = nil
    }
  }

  private func startLink() {
    let l = CADisplayLink(target: self, selector: #selector(tick(_:)))
    l.add(to: .main, forMode: .common)
    link = l
  }

  func begin() {
    guard link == nil || prerolling else { return }
    prerolling = false
    frames = 0
    dropped = 0
    hitches = 0
    worst = 0
    configures = 0
    configureTotal = 0
    configureMax = 0
    last = 0
    deltas.removeAll(keepingCapacity: true)
    lastOffset = nil
    fingerUpFrame = -1
    events.removeAll()
    busy.removeAll()
    busyLong = 0
    busyMax = 0
    gesture += 1
    start = CACurrentMediaTime()
    screen.begin(expected: expected)
    if link == nil { startLink() }
    watchMainThread()
  }

  @objc private func tick(_ l: CADisplayLink) {
    let frameDuration = l.targetTimestamp - l.timestamp
    if frameDuration > 0 { expected = frameDuration }
    if prerolling {
      screen.idleFrame()
      return
    }
    if last > 0 {
      let dt = l.timestamp - last
      frames += 1
      if dt > expected * 1.5 { dropped += max(1, Int((dt / expected).rounded()) - 1) }
      if dt > 0.05 { hitches += 1 }
      worst = max(worst, dt)
    }
    last = l.timestamp
    let offset = offsetProvider?() ?? 0
    if let prev = lastOffset { deltas.append(offset - prev) }
    lastOffset = offset
    screen.frame(offset: offset, expected: expected)
  }

  /** Doigt leve avec elan : separe le glissement de la deceleration dans `motion`. */
  func fingerUp() {
    guard isRunning else { return }
    fingerUpFrame = deltas.count
    mark("up")
  }

  /** Evenement visible pendant le geste (revelation, banniere, page...). */
  func mark(_ what: String) {
    guard isRunning, gesture <= Self.detailedGestures, events.count < Self.maxEvents else { return }
    let ms = ((CACurrentMediaTime() - start) * 1000).rounded()
    events.append([ms, what, Int(offsetProvider?() ?? 0)])
  }

  /** Millisecondes entieres depuis `t0` (cout d'une etape, pour les `events`). */
  static func ms(since t0: CFTimeInterval) -> Int {
    Int(((CACurrentMediaTime() - t0) * 1000).rounded())
  }

  // MARK: Occupation du fil principal

  private func watchMainThread() {
    guard observer == nil else { return }
    busySince = 0
    let activities = CFRunLoopActivity.afterWaiting.rawValue | CFRunLoopActivity.beforeWaiting.rawValue
    // Ordre maximal : passe APRES le commit Core Animation (ordre 2 000 000),
    // donc l'occupation mesuree comprend la mise en page et le commit.
    let obs = CFRunLoopObserverCreateWithHandler(kCFAllocatorDefault, activities, true, CFIndex.max) {
      [weak self] _, activity in
      self?.runLoop(activity)
    }
    CFRunLoopAddObserver(CFRunLoopGetMain(), obs, .commonModes)
    observer = obs
  }

  private func unwatchMainThread() {
    guard let obs = observer else { return }
    CFRunLoopRemoveObserver(CFRunLoopGetMain(), obs, .commonModes)
    CFRunLoopObserverInvalidate(obs)
    observer = nil
    busySince = 0
  }

  private func runLoop(_ activity: CFRunLoopActivity) {
    let now = CACurrentMediaTime()
    if activity == .afterWaiting {
      busySince = now
      return
    }
    let since = busySince
    guard since > 0 else { return }
    busySince = 0
    let d = now - since
    busyMax = max(busyMax, d)
    guard d > Self.busyThreshold else { return }
    busyLong += 1
    if busy.count < Self.maxBusy {
      let ms = { (s: CFTimeInterval) -> Double in (s * 10_000).rounded() / 10 }
      busy.append([ms(since - start), ms(d), Double(Int(offsetProvider?() ?? 0))])
    }
  }

  /**
   Image immobile (< 0,5 pt) alors que le contenu bougeait avant ET apres
   (>= 2 pt) : le doigt glisse mais la liste s'arrete. Saut : plus du double
   de ses voisines et au moins 12 pt de plus.
   */
  private func motionStats() -> (stalls: Int, jumps: Int, at: [[Int]]) {
    var stalls = 0
    var jumps = 0
    var at: [[Int]] = []
    let m = deltas.map { abs($0) }
    guard m.count >= 3 else { return (0, 0, []) }
    let firstMoving = m.firstIndex { $0 >= 2 } ?? m.count
    let lastMoving = m.lastIndex { $0 >= 2 } ?? -1
    for i in 1..<(m.count - 1) {
      let around = max(m[i - 1], m[i + 1])
      if m[i] < 0.5 && i > firstMoving && i < lastMoving && around >= 2 {
        stalls += 1
        if at.count < 6 { at.append([i, 0]) }
      } else if m[i] > 2 * around && m[i] - around >= 12 {
        jumps += 1
        if at.count < 6 { at.append([i, Int(m[i].rounded())]) }
      }
    }
    return (stalls, jumps, at)
  }

  func recordConfigure(_ seconds: CFTimeInterval) {
    guard isRunning else { return }
    configures += 1
    configureTotal += seconds
    configureMax = max(configureMax, seconds)
  }

  func end(rows: Int, offset: CGFloat) {
    guard let l = link, !prerolling else { return }
    l.invalidate()
    link = nil
    unwatchMainThread()
    let ms = { (s: CFTimeInterval) -> Double in (s * 1000 * 10).rounded() / 10 }
    let motion = motionStats()
    var report: [String: Any] = [
      "kind": "scroll",
      "gesture": gesture,
      "durationMs": ms(CACurrentMediaTime() - start),
      "fps": Int((1 / expected).rounded()),
      "frames": frames,
      "dropped": dropped,
      "hitches": hitches,
      "worstMs": ms(worst),
      "configures": configures,
      "configureAvgMs": configures > 0 ? ms(configureTotal / Double(configures)) : 0,
      "configureMaxMs": ms(configureMax),
      "rows": rows,
      "offsetY": Int(offset),
      "stalls": motion.stalls,
      "jumps": motion.jumps,
      "mainBusy": busy,
      "mainBusyLong": busyLong,
      "mainBusyMaxMs": ms(busyMax),
    ]
    if !motion.at.isEmpty { report["motionAt"] = motion.at }
    if gesture <= Self.detailedGestures {
      // Profil image par image (points entiers) : glissement puis elan.
      report["motion"] = deltas.prefix(Self.maxMotion).map { (d: CGFloat) -> Int in Int(d.rounded()) }
      report["fingerUpFrame"] = fingerUpFrame
      report["events"] = events
    }
    let session = screen.end()
    // Copie figee : une fermeture differee ne doit pas capturer un `var`.
    let base = report
    // Les derniers affichages du geste arrivent apres son arret : on les attend.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
      var full = base
      if let s = session { full.merge(s.report) { _, new in new } }
      self?.onReport?(full)
    }
  }
}
