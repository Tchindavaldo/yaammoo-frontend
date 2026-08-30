# Prix express : unique par zone, pas par heure

[ ] settings boutique : le prix express doit être unique par zone, pas par heure
    - l'express = "livré dès que la cmd est terminée" → il n'y a pas de créneau,
      donc aucune raison d'avoir un prix différent selon l'heure
    - aujourd'hui `expressZonesByHour` stocke un prix par (heure, lieu) : sur le
      fastfood "Review fast-foo", Banganté est à 500 sur 13:06 et 15:00 mais à 700
      sur 17:25 — incohérent
    - attendu : saisir le prix express d'un lieu le propage à TOUTES les lignes/heures
      de cette zone (une seule valeur par lieu)
    - impacte la page 2 de EditBoutiquePanel/CreateBoutiquePanel + buildDeliveryPayload
    - vérifier l'affichage résultant dans CheckoutExpressOverlay (checkout)
