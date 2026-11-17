package com.rauval.yaammoo.homelist

/**
 Revelation de la liste « Tout » (sortie de `HomeListView.kt`, R4), pendant de
 `HomeListView+Reveal.swift`.

 Normalement : la banniere sort AVEC la premiere boutique (porte), les autres
 boutiques des que leurs images sont la, une boutique deja vue reapparait sans
 squelette.

 Apres `reset()` (tab categorie ouvert, la liste est masquee dessous) : TOUT
 repasse par la porte, images en memoire comprises, puis les boutiques sortent
 en fondu DU HAUT VERS LE BAS (`pump`), jamais une rangee du bas avant celle du
 dessus. Une fois l'ecran sorti, retour au comportement normal.
 */
internal class HLRevealGate(private val host: HomeListView) {
  val revealedShops = HashSet<String>()
  var open = false
    private set
  /** Retour sur « Tout » : sortie ordonnee en fondu, jusqu'a l'ecran sorti. */
  var holding = false
    private set
  private var bannerReady = false
  private var firstShopReady = false
  var bannerView: HLBannerView? = null
  private var firstShopRow: HLShopRowView? = null

  /** Retour sur « Tout » : les squelettes viennent des donnees masquees envoyees par JS. */
  fun reset() {
    holding = true
    revealedShops.clear()
    open = false
    bannerReady = false
    firstShopReady = false
    firstShopRow = null
  }

  fun onShopReady(row: HLShopRowView) {
    if (row.position == 0 && !open) {
      firstShopReady = true
      firstShopRow = row
      tryOpen()
      return
    }
    // Tour suivant : la rangee est configuree PENDANT sa liaison, avant d'etre attachee.
    if (holding) {
      host.post { pump() }
      return
    }
    reveal(row)
  }

  fun onBannerReady(banner: HLBannerView) {
    bannerReady = true
    bannerView = banner
    if (open) banner.reveal(true) else tryOpen()
  }

  /**
   La banniere sort AVEC la premiere boutique, dans la meme animation. Sans
   boutique, elle sort seule.
   */
  fun tryOpen() {
    if (open) return
    val hasShop = host.rows.any { it is HLRowContent.Shop }
    val needsBanner = host.shownBanners.isNotEmpty()
    // Sans boutique ET sans chargement seulement : sinon la banniere sortirait
    // avant que la premiere boutique (et ses images) soit arrivee.
    if (!((firstShopReady || (!hasShop && !host.listLoading)) && (bannerReady || !needsBanner))) return
    open = true
    if (holding) {
      host.post { pump() }
    } else {
      firstShopRow?.takeIf { it.position == 0 }?.let { reveal(it) }
    }
    bannerView?.reveal(true)
    // Rangees sous l'ecran creees au repos, une fois le fondu termine.
    host.preheater.schedule(HLLayout.revealMs + 100)
  }

  /**
   Sort les boutiques pretes dans l'ordre des positions, et s'arrete a la
   premiere a l'ecran qui ne l'est pas encore. Une rangee entierement au-dessus
   de l'ecran ne bloque pas celles du dessous.
   */
  fun pump() {
    if (!holding || !open) return
    val list = host.list
    val rows = (0 until list.childCount)
      .mapNotNull { list.getChildAt(it) as? HLShopRowView }
      .sortedBy { it.position }
    var allOut = true
    for (r in rows) {
      if (r.content !is HLRowContent.Shop || r.revealed) continue
      if (!r.ready) {
        allOut = false
        if (r.bottom <= 0) continue
        break
      }
      reveal(r)
    }
    if (allOut) holding = false
  }

  /** Rangee prete preparee hors ecran pendant le retour : elle sort a son entree a l'ecran. */
  fun onAttached(row: HLShopRowView) {
    if (!open || holding || row.content !is HLRowContent.Shop || !row.ready || row.revealed) return
    reveal(row)
  }

  private fun reveal(row: HLShopRowView) {
    (row.content as? HLRowContent.Shop)?.let { revealedShops.add(it.shop.id) }
    if (!row.revealed) host.mark { "reveal${row.position}" }
    row.reveal(true)
  }
}
