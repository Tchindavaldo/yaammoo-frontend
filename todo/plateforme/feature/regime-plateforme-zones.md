# Régime plateforme : l'app ignore les zones Yaammoo (À DISCUTER)

[ ] ⚠️ IMPORTANT — à rappeler à l'utilisateur, point non encore discuté
    - en régime `delivery_by = 'platform'` (Yaammoo livre), le backend prend
      les zones dans `platformDeliveryZones` (périodique) et
      `platformExpressZones` (express, sans heure, migration 073)
      — `deliverySource` dans `src/services/pricing/deliveryPricing.js` (backend)
    - l'app, elle, ne lit QUE `deliveryHours` / `expressZones` de la boutique
      (checkout home, panier, panier groupé) : en régime plateforme elle
      proposerait les zones/prix du marchand, pas ceux de Yaammoo
    - risque : prix de course affiché ≠ prix attendu → paiement refusé
      (`delivery_price_mismatch`) ou zones inexistantes côté plateforme
    - à décider : le backend sert-il directement les bonnes zones selon le
      régime (recommandé : l'app reste muette sur le régime), ou l'app lit-elle
      `platform*` ? Aucune boutique en régime plateforme en prod au 14/11/2026
    - fichier jumeau backend : `todo/plateforme/feature/regime-plateforme-zones.md`
