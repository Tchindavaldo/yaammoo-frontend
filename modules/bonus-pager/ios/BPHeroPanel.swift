import UIKit

/**
 Panneau heros du pied de page (`BonusPagerInfo` cote RN) : FIXE, rien ne
 glisse. Chaque element s'anime SEUL, en fonction de la position du scroll :

 - couleurs (icone, fond du badge, filigrane, point et libelle de statut,
   jauge) : melange continu entre les deux bonus encadrants ;
 - textes et glyphe : chaque element change a son propre moment (decalage
   `offset`), par un court fondu, et seulement si sa valeur differe — un
   emetteur identique d'un bonus a l'autre ne bouge pas ;
 - jauge : remplie en continu de 0 (1er bonus) a pleine (dernier).
 */
final class BPHeroPanel: UIView {
  /** Ligne icone 22 + gap 6 + nom 17 + gap 6 + statut 14. */
  static let height: CGFloat = 65
  /** Largeur de la jauge (`GAUGE_W` cote RN). */
  static let gaugeWidth: CGFloat = 40

  private let badge = UIView()
  private let dot = UIView()
  private let gauge = UIView()
  private let gaugeFill = UIView()
  private var ghost = BPFadeStack<UILabel>()
  private var icon = BPFadeStack<BPIconView>()
  private var issuer = BPFadeStack<UILabel>()
  private var name = BPFadeStack<UILabel>()
  private var status = BPFadeStack<UILabel>()
  private var colors: [BPRGBA] = []
  private var statusColors: [BPRGBA] = []
  private var position: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    clipsToBounds = true
    badge.layer.cornerRadius = 7
    dot.layer.cornerRadius = 3.5
    gauge.backgroundColor = UIColor(white: 0, alpha: 0.08)
    gauge.layer.cornerRadius = 1.5
    gauge.clipsToBounds = true
    gaugeFill.layer.cornerRadius = 1.5
    gauge.addSubview(gaugeFill)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(items: [BPItem], iconFontFamily: String?) {
    subviews.forEach { $0.removeFromSuperview() }
    colors = items.map { BPRGBA($0.color) }
    statusColors = items.map { BPRGBA($0.statusColor) }

    // Ordre d'empilement : filigrane au fond, puis badge, textes, jauge.
    ghost = BPFadeStack(keys: items.indices.map { "\($0 + 1)" }, offset: -0.2, parent: self) { i in
      let l = UILabel()
      l.attributedText = NSAttributedString(string: "\(i + 1)", attributes: [
        .font: UIFont.systemFont(ofSize: 96, weight: .black), .kern: -4,
      ])
      return l
    }
    addSubview(badge)
    icon = BPFadeStack(keys: items.map { $0.icon }, offset: -0.1, parent: self) { i in
      BPIconView(glyph: items[i].icon, size: 13, fontFamily: iconFontFamily)
    }
    issuer = BPFadeStack(keys: items.map { "\($0.issuer)|\($0.remaining ?? "")" }, offset: -0.05,
                         parent: self) { i in
      let l = UILabel()
      let s = NSMutableAttributedString(string: items[i].issuer, attributes: [
        .font: UIFont.systemFont(ofSize: 11, weight: .bold),
        .foregroundColor: UIColor(white: 0, alpha: 0.6),
      ])
      if let r = items[i].remaining {
        s.append(NSAttributedString(string: "  \(r)", attributes: [
          .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
          .foregroundColor: UIColor(white: 0, alpha: 0.35),
        ]))
      }
      l.attributedText = s
      l.lineBreakMode = .byTruncatingTail
      return l
    }
    name = BPFadeStack(keys: items.map { $0.name }, offset: 0, parent: self) { i in
      let l = UILabel()
      l.text = items[i].name
      l.font = .systemFont(ofSize: 14, weight: .heavy)
      l.textColor = UIColor(white: 0, alpha: 0.82)
      l.lineBreakMode = .byTruncatingTail
      return l
    }
    addSubview(dot)
    status = BPFadeStack(keys: items.map { $0.statusLabel }, offset: 0.1, parent: self) { i in
      let l = UILabel()
      l.text = items[i].statusLabel
      l.font = .systemFont(ofSize: 11, weight: .heavy)
      l.lineBreakMode = .byTruncatingTail
      return l
    }
    addSubview(gauge)
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let w = bounds.width
    for l in ghost.views {
      let gs = l.sizeThatFits(CGSize(width: CGFloat.greatestFiniteMagnitude, height: 96))
      l.frame = CGRect(x: w + 6 - gs.width, y: -18, width: gs.width, height: 96)
    }
    badge.frame = CGRect(x: 0, y: 0, width: 22, height: 22)
    icon.views.forEach { $0.frame = badge.frame }
    issuer.views.forEach { $0.frame = CGRect(x: 28, y: 0, width: w - 28, height: 22) }
    name.views.forEach { $0.frame = CGRect(x: 0, y: 28, width: w, height: 17) }
    let rowY: CGFloat = 51
    let rowH: CGFloat = 14
    dot.frame = CGRect(x: 0, y: rowY + (rowH - 7) / 2, width: 7, height: 7)
    let gw = BPHeroPanel.gaugeWidth
    status.views.forEach { $0.frame = CGRect(x: 12, y: rowY, width: max(0, w - 12 - 9 - gw), height: rowH) }
    gauge.frame = CGRect(x: w - gw, y: rowY + (rowH - 3) / 2, width: gw, height: 3)
    sync(position: position)
  }

  /** Appele a chaque image du scroll. */
  func sync(position p: CGFloat) {
    position = p
    let n = colors.count
    guard n > 0 else { return }
    let last = CGFloat(n - 1)
    let q = min(max(p, 0), last)
    let lo = Int(q.rounded(.down))
    let hi = min(lo + 1, n - 1)
    let t = q - CGFloat(lo)

    let tint = colors[lo].mix(colors[hi], t)
    badge.backgroundColor = tint.withAlphaComponent(CGFloat(0x1f) / 255)
    gaugeFill.backgroundColor = tint
    icon.views.forEach { $0.color = tint }
    let ghostTint = tint.withAlphaComponent(0.07)
    ghost.views.forEach { $0.textColor = ghostTint }
    let st = statusColors[lo].mix(statusColors[hi], t)
    dot.backgroundColor = st
    status.views.forEach { $0.textColor = st }

    for stack in [ghost.fade, icon.fade, issuer.fade, name.fade, status.fade] {
      stack(q, n)
    }
    gaugeFill.frame = CGRect(x: 0, y: 0, width: gauge.bounds.width * (last > 0 ? q / last : 1), height: 3)
  }
}

/**
 Un element du panneau : une vue par suite de valeurs IDENTIQUES consecutives
 (un texte qui ne change pas d'un bonus a l'autre n'a qu'une vue, donc aucun
 fondu). Le passage d'une vue a la suivante est un fondu croise court
 (`half` de part et d'autre), centre a mi-chemin + `offset` : chaque element
 bascule a son propre moment.
 */
struct BPFadeStack<V: UIView> {
  private struct Run {
    let view: V
    let from: Int
    let to: Int
  }

  private static var half: CGFloat { 0.15 }
  private var runs: [Run] = []
  private var offset: CGFloat = 0

  init() {}

  init(keys: [String], offset: CGFloat, parent: UIView, make: (Int) -> V) {
    self.offset = offset
    var i = 0
    while i < keys.count {
      var j = i
      while j + 1 < keys.count && keys[j + 1] == keys[i] { j += 1 }
      let v = make(i)
      parent.addSubview(v)
      runs.append(Run(view: v, from: i, to: j))
      i = j + 1
    }
  }

  var views: [V] { runs.map { $0.view } }

  /** Opacite de chaque vue pour la position `q` (bornee) sur `n` bonus. */
  var fade: (CGFloat, Int) -> Void {
    let runs = runs
    let o = offset
    let h = BPFadeStack.half
    return { q, n in
      for r in runs {
        var a: CGFloat = 1
        if r.from > 0 {
          let c = CGFloat(r.from) - 0.5 + o
          a = min(a, (q - (c - h)) / (2 * h))
        }
        if r.to < n - 1 {
          let c = CGFloat(r.to) + 0.5 + o
          a = min(a, ((c + h) - q) / (2 * h))
        }
        r.view.alpha = min(max(a, 0), 1)
      }
    }
  }
}
