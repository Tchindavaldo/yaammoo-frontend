# Notifications boutique — envois aux clients

Settings → Boutique → **Notifications**. Le marchand envoie une notification
(titre, message et image optionnels) à une **audience** — ses clients, les
utilisateurs d'une ville, ou tout le monde — dans la limite du quota de son
plan (Gratuit par défaut). Maquette : canevas « Notifications boutique »,
variantes « 6 · N envoyées ».

Backend : `BACKEND/architecture/notifications-broadcast.md` (routes, plans,
quota atomique, diffusion).

## Fichiers

| Fichier | Rôle |
|---|---|
| `merchant/components/broadcast/BroadcastManageModal.tsx` | Écran plein écran (vue absolue comme `MenuManageModal`) : header, page qui défile, bouton flottant, composeur, toasts |
| `merchant/components/broadcast/BroadcastWeekCard.tsx` | Carte calendrier : mois + puce du plan, une barre par jour (hauteur = envois), limites du plan toujours visibles, reste de la semaine |
| `merchant/components/broadcast/BroadcastQuotaTiles.tsx` | Tuile sombre « Aujourd'hui » (reste / limite + capsules) et tuile « Remise à zéro » (compte à rebours jusqu'à minuit) |
| `merchant/components/broadcast/BroadcastHistory.tsx` | Derniers envois selon leur nombre (voir plus bas) + carte dépliée d'un envoi unique |
| `merchant/components/broadcast/BroadcastHistoryRow.tsx` | Ligne repliable + gabarits par nombre d'envois (`rowLayoutFor`) + vignette + résumé d'audience |
| `merchant/components/broadcast/BroadcastComposer.tsx` | Composeur flottant : audience, aperçu, titre, message et image révélés à la demande, envoi |
| `merchant/components/broadcast/BroadcastAudiencePicker.tsx` | Puces « Mes clients / Ma ville / Tout le monde » (selon le plan) + villes desservies |
| `merchant/components/broadcast/BroadcastPreview.tsx` | Aperçu en direct de la notification reçue (icône app, photo floutée en fond) |
| `merchant/components/broadcast/broadcastTheme.ts` | Palette de l'écran + style des étiquettes en capitales |
| `merchant/hooks/useBroadcast.ts` | Plan, villes, historique (chargés à l'ouverture), pull-to-refresh, envoi (upload de l'image locale d'abord) |
| `merchant/services/broadcastService.ts` | Appels HTTP, `FREE_PLAN` (repli avant réponse), message d'erreur du backend |
| `merchant/utils/broadcastQuota.ts` | Calculs purs : quota restant, barres de la semaine, compte à rebours, étiquettes de date |
| `merchant/types/broadcast.types.ts` | Types |

## Derniers envois : disposition selon le nombre

La zone va toujours jusqu'au bouton « Écrire une notification ».

| Envois | Rendu |
|---|---|
| 0 | Cadre pointillé « Aucune notification envoyée » |
| 1 | Carte dépliée d'office : photo sur toute la hauteur libre, date + audience en puces, titre, message, « Réutiliser » |
| 2 | Deux lignes repliées (vignette 80) qui se partagent la hauteur |
| 3 | Trois lignes (vignette 56) |
| 4 | Quatre lignes compactes (vignette 40) |
| 5 et plus | Lignes compactes à hauteur fixe, la page défile |

Mécanique : la page est un `ScrollView` à `flexGrow: 1`, la zone d'historique
prend l'espace restant (`flexGrow: 1`) et les lignes, `flexGrow: 1` au-dessus
d'une `minHeight`, se le partagent. Sur un petit écran où les lignes ne tiennent
pas, la page défile au lieu d'écraser les lignes. Toucher une ligne la déplie
(`LayoutAnimation`) : message, audience et nombre de personnes touchées
(connu une fois la diffusion terminée), « Réutiliser » qui rouvre le composeur
prérempli (audience comprise si le plan la permet encore).

## Audience

| Puce | Destinataires (backend) |
|---|---|
| Mes clients | ont commandé dans la boutique |
| Ma ville | dernière ville connue de l'utilisateur (voir [user-location.md](./user-location.md)) ; sans localisation, villes des boutiques où il a commandé |
| Tout le monde | tous les utilisateurs |

- Seules les audiences du plan (`plan.audiences`) sont proposées ; le plan
  Gratuit les permet toutes.
- « Ma ville » : villes desservies par la boutique (`cities` du GET). Une seule
  → la puce porte son nom ; plusieurs → seconde rangée à choisir (envoi bloqué
  tant qu'aucune n'est choisie) ; aucune → puce masquée.
- Puces masquées clavier ouvert (la place manque, et ce n'est pas une saisie).

## Quota

Calculé côté client à partir des dates d'envoi (`computeQuota`) : envois du jour,
de la semaine (lundi 00:00), et `dayLeft = min(dayLimit - jour, weekLimit - semaine)`.
C'est un **affichage** : le backend applique le quota (refus 429, message
affiché tel quel en toast). Quota du jour atteint : le bouton passe gris.

## Composeur

- Vue absolue dans l'overlay (pas de `<Modal>`), posée au-dessus de la tab bar,
  remontée au-dessus du clavier par les events `Keyboard` (même principe que le
  retrait de `PorteFeuillePanel`).
- Animations en driver JS : une opacité native bloque le défilement de la bande
  de photos sur Android (cf. [blur-safe-area.md](./blur-safe-area.md)).
- Image : photos des menus de la boutique (URL déjà publiques), ou galerie
  (`expo-image-picker`), uploadée par `uploadImageToServer(uri, "broadcasts")`
  à l'envoi.
- Titre 50 caractères, message 150.

## API

```
GET  /notification/broadcast/:fastFoodId
  → { data: { plan: { key, label, dayLimit, weekLimit, audiences[] },
              cities: string[],
              items: [{ id, title, body?, imageUrl?, audience, city?,
                        recipientsCount, sentAt }] } }   // plus récent d'abord

POST /notification/broadcast/:fastFoodId
  { title, body?, imageUrl?, audience: 'customers' | 'city' | 'all', city? }
  → 201 { data: <envoi> } · 400 · 403 (audience hors plan) · 429 (quota)
```

Bearer requis (ajouté par `setupHttp`) ; propriétaire, admin ou employé ayant
`notifications.send`.

## Côté client (destinataire)

Type `boutique_broadcast` : image dans la liste (`NotificationItem`) et la
fiche (`NotificationDetailSheet`, chip « Voir la boutique »). Le tap ouvre
`/(tabs)?shop=<nom>` : le home ouvre sa recherche sur la boutique
(`restaurants/hooks/useShopSearchDeepLink.ts`). Voir
[notifications.md](./notifications.md).
