import QuartzCore
import UIKit

/**
 Sonde de fluidite de la liste native, pour les builds SANS terminal
 (TestFlight) : les rapports partent vers JS (`onDiagnostics`), qui les
 journalise et les transmet a Sentry.

 Mesure, pour chaque geste de scroll (du doigt pose a l'arret de l'elan) :
 images affichees, images perdues (intervalle > 1,5 x la cadence de l'ecran),
 accrocs (> 50 ms), pire intervalle, et le temps de configuration des
 rangees reutilisees pendant le geste.
 */
final class HLPerfMonitor: NSObject {
  var onReport: (([String: Any]) -> Void)?

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
    start = CACurrentMediaTime()
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
    onReport?([
      "kind": "scroll",
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
    ])
  }
}
