/**
 Textes affiches par la liste native (header boutique, cartes). Envoyes par
 le JS (prop `labels`, traduits par `t()`, cf. architecture/i18n.md) : un mot
 se corrige par OTA, et la langue change a chaud. Valeurs par defaut =
 francais, avant la premiere prop.
 */
enum HLStrings {
  static var statusOpen = "Ouvert"
  static var delivery = "Livraison"
  static var deliveryLower = "livraison"
  static var deliveredIn = "Livré en"
  static var reviews = "avis"
  static var next = "Prochaine"
  static var available = "disponible"

  /// Applique les textes recus ; vrai si au moins un a change.
  static func apply(_ r: HLLabelsRecord) -> Bool {
    let before = [statusOpen, delivery, deliveryLower, deliveredIn, reviews, next, available]
    statusOpen = r.statusOpen; delivery = r.delivery; deliveryLower = r.deliveryLower
    deliveredIn = r.deliveredIn; reviews = r.reviews; next = r.next; available = r.available
    return before != [statusOpen, delivery, deliveryLower, deliveredIn, reviews, next, available]
  }
}
