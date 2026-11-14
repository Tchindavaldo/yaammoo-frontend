# Régime plateforme : servir à l'app les zones et prix Yaammoo

[ ] DÉCIDÉ le 14/11/2026 : quand Yaammoo livre (`delivery_by = 'platform'`),
    l'app propose UNIQUEMENT les zones et prix de la plateforme
    (`platformDeliveryZones` périodique par heure, `platformExpressZones` express),
    jamais ceux du marchand
    - les zones plateforme sont posées par l'ADMIN, par boutique
      (`PATCH` delivery config backend, `adminGuard`) ; la bascule en `platform`
      est refusée tant qu'aucune zone n'est configurée
    - à faire côté backend : `GET /fastfood/all` et `/fastfood/:id` renvoient,
      en régime plateforme, ces zones dans `deliveryHours` / `expressZones`
      (avec prix d'affichage) : l'app n'a rien à changer
    - côté app : vérifier ensuite checkout home, panier et panier groupé
    - fichier jumeau backend : `todo/plateforme/feature/regime-plateforme-zones.md`
