package com.rauval.yaammoo.homelist

/**
 * Textes affiches par la liste native (header boutique, cartes). Envoyes par
 * le JS (prop `labels`, traduits par `t()`, cf. architecture/i18n.md) : un mot
 * se corrige par OTA, et la langue change a chaud. Valeurs par defaut =
 * francais, avant la premiere prop.
 */
object HLStrings {
  var statusOpen = "Ouvert"
  var delivery = "Livraison"
  var deliveryLower = "livraison"
  var deliveredIn = "Livré en"
  var reviews = "avis"
  var next = "Prochaine"
  var available = "disponible"

  /** Applique les textes recus ; vrai si au moins un a change. */
  fun apply(r: HLLabelsRecord): Boolean {
    val before = listOf(statusOpen, delivery, deliveryLower, deliveredIn, reviews, next, available)
    statusOpen = r.statusOpen; delivery = r.delivery; deliveryLower = r.deliveryLower
    deliveredIn = r.deliveredIn; reviews = r.reviews; next = r.next; available = r.available
    return before != listOf(statusOpen, delivery, deliveryLower, deliveredIn, reviews, next, available)
  }
}
