# Annulation sur demande : le client demande, le marchand décide

**Gravité : ÉLEVÉE — à régler rapidement.**

L'annulation par le client devient une **demande** que le marchand accepte ou
refuse. Pendant de la tâche backend
`yaammoo-backend/todo/user/feature/annulation-sur-demande.md`.

## Fait (boutique WhatsApp uniquement)

[x] Client : demande d'annulation (`cancelRequest`), état « En attente de la réponse
    du marchand », « Renvoyer la demande », refus affiché (`OrderCancelButton`)
[x] Marchand WhatsApp : demande reçue avec deux boutons (backend)
[x] Versioning R11 (`cancel_request_min_app_version`), verrou de concurrence

## Reste à faire : marchand qui utilise l'APP

Aujourd'hui une boutique gérée dans l'app est annulée directement par le client
(`cancelByUser`). Elle doit passer par la même demande.

[ ] Backend : appliquer la demande à TOUTES les boutiques, pas seulement WhatsApp
[ ] App marchand : recevoir la demande (push + socket) avec deux choix
    « Accepter l'annulation » / « Refuser, déjà commencée »
[ ] App marchand : la commande affiche « Annulation demandée » tant qu'il n'a pas répondu
[ ] Client : toast global (R22) quand le marchand accepte ou refuse
[ ] Remboursement à l'acceptation : règles d'argent (R23)
[ ] Délai sans réponse du marchand : à décider
