# Annulation sur demande : le client demande, le marchand décide

**Gravité : ÉLEVÉE — à régler rapidement.**

L'annulation par le client devient une **demande** que le marchand accepte ou
refuse. Pendant de la tâche backend
`yaammoo-backend/todo/user/feature/annulation-sur-demande.md`.

## Fait

[x] Client : demande d'annulation (`cancelRequest`), « En attente de la réponse du
    marchand », « Renvoyer la demande », refus affiché (`OrderCancelButton`)
[x] Marchand WhatsApp : demande reçue avec deux boutons (backend)
[x] Versioning R11 (`cancel_request_min_app_version`), verrou de concurrence
[x] Backend : demande étendue à toutes les boutiques (`cancel_request_all_shops`,
    migration 096), push au marchand, `POST /order/:orderId/cancel-request/accept|refuse`
[x] App marchand : bouton « Annulation » sur la carte + sheet Accepter / Refuser
[x] Client : toast global (R22) à la décision du marchand

## Reste à faire

[ ] Appliquer la migration 096 (test puis prod), déployer le backend
[ ] Passer `cancel_request_all_shops` à `true` quand les marchands ont l'app 1.1.7
[ ] Délai sans réponse du marchand : à décider
