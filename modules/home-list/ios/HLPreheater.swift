import UIKit

/**
 Prechauffage des rangees : cree AU REPOS, avant le premier scroll, les
 cellules des rangees situees sous l'ecran.

 Une rangee neuve coute 10 a 16 ms a son premier affichage (sa liste de cartes
 et ses cartes sont creees) : une image perdue a l'entree des boutiques 2 a 5
 au premier scroll (journal `[HL]` du 27/09, `in2d5n` a `in5d5n`). Ensuite
 UIKit recycle ces cellules (1 a 2 ms). Ici, la liste est agrandie PAR LE BAS,
 une rangee de plus par etape : la partie ajoutee est sous le bord de la vue
 hote, qui la masque, et le haut ne bouge pas. Une fois la zone couverte, la
 liste reprend sa taille et les cellules creees partent dans la reserve de
 UIKit, pretes pour le scroll.

 Une seule fois par lancement. Le premier geste l'interrompt (taille reprise
 aussitot) : les rangees restantes se creent alors au scroll, comme avant.
 */
final class HLPreheater {
  struct Geometry {
    /** Bas de l'ecran et hauteur visible, en coordonnees de la liste. */
    let viewportBottom: CGFloat
    let viewportHeight: CGFloat
    /** Haut de chaque rangee, dans l'ordre. */
    let rowTops: [CGFloat]
  }

  /** Hauteur a prechauffer sous l'ecran, en ecrans (prop `preheatScreens`, 0 = coupe). */
  var screens: CGFloat = 2
  /** Hauteur ajoutee a la liste sous l'ecran (0 = taille normale). */
  private(set) var extra: CGFloat = 0

  /** Pose la hauteur ajoutee et met la liste en page (les cellules naissent ici). */
  var apply: ((CGFloat) -> Void)?
  /** `nil` = liste en mouvement : on ne prechauffe pas. */
  var geometry: (() -> Geometry?)?
  var onReport: (([String: Any]) -> Void)?

  private enum State { case idle, waiting, running, finished }
  private var state = State.idle
  private var steps: [Int] = []
  private var cellsBefore = (rows: 0, cards: 0)

  /** Pause entre deux etapes : une rangee par image, le reste du temps libre. */
  private static let stepDelay: TimeInterval = 0.03

  /** Apres la revelation de la premiere boutique (fondu termine). Une fois par lancement. */
  func schedule(after delay: TimeInterval) {
    guard state == .idle, screens > 0 else { return }
    state = .waiting
    cellsBefore = (HLShopCell.created, HLMenuCardCell.created)
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
      guard let self = self, self.state == .waiting else { return }
      self.state = .running
      self.step()
    }
  }

  /**
   Geste de l'utilisateur, ou zone couverte : la liste reprend sa taille tout
   de suite. Un geste AVANT le depart annule tout (`stepsMs` vide au rapport).
   */
  func stop(reason: String) {
    guard state == .waiting || state == .running else { return }
    state = .finished
    let t0 = CACurrentMediaTime()
    if extra != 0 {
      extra = 0
      apply?(0)
    }
    onReport?([
      "kind": "preheat",
      "end": reason,
      "stepsMs": steps,
      "restoreMs": HLPerfMonitor.ms(since: t0),
      "newRowCells": HLShopCell.created - cellsBefore.rows,
      "newCardCells": HLMenuCardCell.created - cellsBefore.cards,
    ])
  }

  private func step() {
    guard state == .running else { return }
    guard let g = geometry?() else { return stop(reason: "moving") }
    let limit = g.viewportBottom + screens * g.viewportHeight
    // Premiere rangee pas encore couverte : on etend jusqu'a son premier point.
    let covered = g.viewportBottom + extra
    guard let top = g.rowTops.first(where: { $0 >= covered && $0 < limit }) else {
      return stop(reason: "done")
    }
    let t0 = CACurrentMediaTime()
    extra = top + 1 - g.viewportBottom
    apply?(extra)
    steps.append(HLPerfMonitor.ms(since: t0))
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.stepDelay) { [weak self] in self?.step() }
  }
}
