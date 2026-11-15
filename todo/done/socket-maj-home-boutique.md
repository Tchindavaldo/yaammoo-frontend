# Socket : maj du home quand le marchand modifie sa boutique (IMPLÉMENTÉ)

[x] IMPLÉMENTÉ : `fastfoodUpdated` est traité par `src/services/socketHandlers/catalogEvents.ts`
    (upsert de la boutique), et `refreshLoadedSilently()` rattrape au retour en ligne.
    Gérer la mise à jour au socket sur le home des infos du fastfood et heure de
    livraison quand un marchand modifie ses données depuis "Gérer ma boutique"
    de la page paramètres.
