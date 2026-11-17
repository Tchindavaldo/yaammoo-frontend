# Annulation sur demande : le client demande, le marchand décide

**Gravité : ÉLEVÉE — à régler rapidement.**

Aujourd'hui le client annule seul (`cancelByUser` passe tel quel côté backend).
Les marchands qui travaillent par WhatsApp (module WhatsApp de rauval-backend)
ne peuvent pas suivre une annulation imposée : l'annulation devient une
**demande** que le marchand accepte ou refuse. Pendant de la tâche backend
`yaammoo-backend/todo/user/feature/annulation-sur-demande.md`.

## Côté client

[ ] Remplacer « Annuler » par « Demander l'annulation »
    - possible seulement tant que la commande n'est pas commencée (`pending`)
    - dès `processing` (préparation commencée) : bouton masqué, message clair
      « La boutique a déjà commencé votre commande, elle ne peut plus être annulée »
[ ] Afficher l'état « Annulation demandée » en attendant la réponse du marchand
[ ] Toast global (R22) quand le marchand accepte ou refuse

## Côté marchand (app)

[ ] Recevoir la demande avec deux choix : « Accepter l'annulation » / « Refuser, déjà commencée »
[ ] Le marchand qui passe par WhatsApp reçoit la même demande avec deux boutons
    (template `yam_demande_annulation` du module WhatsApp)

## Points d'attention

[ ] Nouveau statut (ex. `cancelRequested`) : versioning R11 côté backend pour les
    apps déjà publiées
[ ] Remboursement à l'acceptation : règles d'argent (R23)
[ ] Délai sans réponse du marchand : à décider
