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

  var isRunning: Bool { link != nil }

  func begin() {
    guard link == nil else { return }
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
    gesture += 1
    start = CACurrentMediaTime()
    screen.begin(expected: expected)
    let l = CADisplayLink(target: self, selector: #selector(tick(_:)))
    l.add(to: .main, forMode: .common)
    link = l
  }

  @objc private func tick(_ l: CADisplayLink) {
    let frameDuration = l.targetTimestamp - l.timestamp
    if frameDuration > 0 { expected = frameDuration }
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
    guard link != nil else { return }
    fingerUpFrame = deltas.count
  }

  /** Evenement visible pendant le geste (revelation, banniere, page...). */
  func mark(_ what: String) {
    guard link != nil, gesture <= Self.detailedGestures, events.count < Self.maxEvents else { return }
    let ms = ((CACurrentMediaTime() - start) * 1000).rounded()
    events.append([ms, what, Int(offsetProvider?() ?? 0)])
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
    guard link != nil else { return }
    configures += 1
    configureTotal += seconds
    configureMax = max(configureMax, seconds)
  }

  func end(rows: Int, offset: CGFloat) {
    guard let l = link else { return }
    l.invalidate()
    link = nil
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
