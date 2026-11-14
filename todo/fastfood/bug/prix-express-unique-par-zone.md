# Prix express : unique par zone, pas par heure

[ ] settings boutique : le prix express doit être unique par zone, pas par heure
    - l'express = "livré dès que la cmd est terminée" → il n'y a pas de créneau,
      donc aucune raison d'avoir un prix différent selon l'heure
    - aujourd'hui `expressZonesByHour` stocke un prix par (heure, lieu).
      Vérifié en base le 14/11/2026 : en TEST (`xaocrcxnueqxnyfqaayf`), « Chez Celestine »
      a Banganté à 500 (13:06, 15:00) et 700 (17:25) ; en PROD (`vcuskusfywrigdrkgnur`),
      aucune boutique n'a deux prix express pour un même lieu.
    - effet : une commande express n'a pas d'heure (refusée par `validateOrder`), donc l'app
      (`CheckoutExpressOverlay`) et le backend (`collectZones`) prennent le prix de la
      PREMIÈRE heure enregistrée pour ce lieu ; les prix des autres heures ne servent jamais
    - risque : l'app saute les heures où l'express est désactivé, le backend non → prix
      différents → paiement refusé (`delivery_price_mismatch`). Aucun cas en base aujourd'hui.
    - attendu : saisir le prix express d'un lieu le propage à TOUTES les lignes/heures
      de cette zone (une seule valeur par lieu)
    - impacte la page 2 de EditBoutiquePanel/CreateBoutiquePanel + buildDeliveryPayload
    - vérifier l'affichage résultant dans CheckoutExpressOverlay (checkout)
