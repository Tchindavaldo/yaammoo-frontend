# Statistiques d'usage (envoi)

Consultation réservée à l'admin, côté backend : voir
[`BACKEND/architecture/analytics.md`](../../BACKEND/architecture/analytics.md)
(payload, types d'événements, routes `GET /analytics/*`).

## Fichiers

```
src/services/analytics/
├── analytics.ts        # File + sessions : track(), flush(), startAnalytics()
├── useAnalytics.ts     # Layout racine : démarrage + temps par écran (screen_view)
├── shopImpressions.ts  # Boutiques vues sur le home (shop_impression, visibleMs)
└── homePages.ts        # Pages du home chargées (home_page_loaded) et recherches (search)
```

## Envoi

- `track(type, { fastFoodId?, menuId?, bannerId?, data? })` met en file, sans jamais lever.
- Lot `POST /analytics/events` : toutes les 20 s s'il y a des événements, dès 50
  en file, au passage en arrière-plan ; battement toutes les 2 min sinon (durée
  de session). 400 = lot jeté ; erreur réseau = gardé (1000 max).
- Non connecté (invité, ou Firebase pas encore restauré) : rien n'est envoyé, la file attend.
- Session = une ouverture au premier plan (`id` généré), close en arrière-plan.
  Appareil : `appVersion`, `platform`, `osVersion`, `deviceModel` (`expo-device`).
- Socket : `appVersion` / `platform` dans la query du handshake (présence côté backend).

## Points de mesure

| Événement | Où |
|---|---|
| `screen_view` | `useAnalytics` (route quittée ou arrière-plan) |
| `home_page_loaded`, `search` | `useFastFoodFetch.fetchPage` → `trackHomePage` |
| `shop_impression` | liste native : event `onVisibleShops` (iOS `HomeListView.swift`, Android `HomeListView.kt`, boutiques visibles à 50 %) ; FlashList : `onViewableItemsChanged`. Émis à la sortie d'écran si visible ≥ 500 ms |
| `menu_open`, `add_to_cart` | `useHomeCheckout` (menu touché ; ajout panier réussi, hors commande payée) |
| `checkout_start` | `useCheckout` / `useCartPayment`, avant `POST /transaction` |
| `payment_result` | `socket.ts`, `payment.settled` (dédoublonné par `__eventId`) |
| `banner_view` / `banner_click` | home : 1re bannière affichée (une fois par lancement) / appui |

⚠️ `onVisibleShops` est natif : absent d'une build antérieure (aucune impression
sur liste native tant que la build n'est pas mise à jour). Retour sur le home
sans scroll : la liste native ne renvoie pas l'ensemble (inchangé), les boutiques
déjà à l'écran ne sont recomptées qu'au prochain scroll. `shop_open` n'est pas
émis (pas de page boutique côté client).
