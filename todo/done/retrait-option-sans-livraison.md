# Option « sans livraison »

[x] (décidé le 14/11/2026 : on GARDE l'option) En régime plateforme, le client
    qui choisit « sur place » paie quand même la course fondue dans le prix du
    plat : c'est VOULU, la course non livrée revient à la plateforme
    (marge, `order_deliveries.delivered = false`, cf. backend `architecture/pricing.md`).
    En régime marchand, la course est facturée à part et vaut 0 en retrait.
    - la card « Aucun » reste désactivée quand le marchand a coupé le retrait
      (`pickupAllowed === false`)
    - pistes futures éventuelles : VIP delivery, réservation de place sur place
