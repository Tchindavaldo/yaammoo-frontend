import UIKit

/**
 Pied de liste (`listFooter` du home) : fin de catalogue (« Vous avez vu
 toutes les boutiques », 13 px gris 400, padding 24) ou liste vide (16 px
 gris 500, centre, marges 40).
 */
final class HLFooterCell: UICollectionViewCell {
  static let reuseId = "footer"
  private let label = UILabel()
  private var empty = false

  static func height(empty: Bool) -> CGFloat { empty ? 240 : 64 }

  override init(frame: CGRect) {
    super.init(frame: frame)
    label.textAlignment = .center
    label.numberOfLines = 0
    contentView.addSubview(label)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) non supporte") }

  func configure(text: String, empty isEmpty: Bool) {
    empty = isEmpty
    label.text = text
    label.font = .systemFont(ofSize: isEmpty ? 16 : 13)
    label.textColor = HLColor.hex(isEmpty ? "#AEAEB2" : "#C7C7CC")
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    label.frame = empty
      ? contentView.bounds.insetBy(dx: 40, dy: 0)
      : contentView.bounds.insetBy(dx: 16, dy: 24)
  }
}
