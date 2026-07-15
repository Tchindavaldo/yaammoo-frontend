# Feature — Orders (côté client)

## Rôle
Gestion de toutes les commandes du client connecté : panier (`pendingToBuy`), en attente (`pending`), en cours (`processing`), terminées, livrées. Inclut le tri par rank pour les files actives.

---

## Arborescence des fichiers

```
yaammoo/src/features/orders/
├── context/
│   └── OrderContext.tsx       # Provider + état global des commandes client
├── hooks/
│   └── useOrders.ts           # Re-export de useOrdersContext (simplicité d'import)
├── services/
│   ├── ratingService.ts       # API notation (menu + livreur) : rate, stats, avis
│   └── ratingStatsCache.ts    # Cache mémoire des stats notation (anti-refetch/loader)
└── components/
    ├── ClientOrderCard.tsx    # Carte commande compacte (liste pending/processing)
    ├── OrderCard.tsx          # Carte commande détaillée (panier pendingToBuy)
    ├── OrderHeader.tsx        # Header de la page orders
    ├── OrderTrackingHeader.tsx # Stats (nb cmd / FF) + chips statut
    ├── CartStatusPanel.tsx    # Panneau suivi virtualisé (FlatList, groupes, jours passés, détail)
    ├── UserOrdersModal.tsx    # Modal plein écran « État des commandes » (Settings → Mes activités)
    ├── DriverInfoTab.tsx      # Tab « Livreur » (infos + stats + notation livreur)
    ├── RateMenuTab.tsx        # Tab « Noter » (image plat + stats + notation plat)
    └── OrderBottomSheet.tsx   # Bottom sheet détail d'une commande
```

> **Suivi des commandes déplacé** : le panier (`cart.tsx`) n'affiche plus que le
> panier (`pendingToBuy`). Le suivi (pending/processing/finished/delivered) vit
> dans `CartStatusPanel`, ouvert via `UserOrdersModal` depuis Settings →
> section « Mes activités » (visible user ET marchand). Deep-links commandes →
> `/(tabs)/settings?section=pending|finished`.

---

## OrderContext.tsx

**Chemin** : `yaammoo/src/features/orders/context/OrderContext.tsx`

**Provider** : `<OrderProvider>` — à placer haut dans l'arbre.

**Données exposées via `useOrders()`** :

| Propriété | Type | Description |
|---|---|---|
| `orders` | `Commande[]` | Toutes les commandes de l'utilisateur |
| `pendingToBuy` | `Commande[]` | Panier (status `pendingToBuy`) |
| `pending` | `Commande[]` | En attente — **triées par rank ASC** |
| `active` | `Commande[]` | En cours (processing…) — **triées par rank ASC** |
| `finished` | `Commande[]` | Terminées + en livraison |
| `delivered` | `Commande[]` | Livrées |
| `stats` | objet | Comptages et montants par statut |
| `loading` | boolean | Chargement en cours |
| `error` | string\|null | Erreur réseau |

**Actions exposées** :

| Méthode | Endpoint | Description |
|---|---|---|
| `refresh(quiet?)` | `GET /order/user/all/:uid` | Recharge toutes les commandes |
| `addOrder(data)` | `POST /order` | Crée une commande |
| `deleteOrder(id)` | `PUT /order` `{status: cancelByUser}` | Annule une commande |
| `updateQuantity(id, qty)` | `PUT /order` `{id, quantity}` | Met à jour la quantité |
| `updateLocalOrder(order)` | — | Met à jour localement sans appel réseau |
| `buyOrders(orders)` | `PUT /order/tabs/:uid` | Passe au statut `pending` (achat panier) |

**Tri par rank** :
- `getFilteredByStatus()` trie automatiquement par `rank ASC` pour les statuts `pending`, `processing`, `active`, `in_progress`, `accept`
- Les commandes sans `rank` (undefined) apparaissent en dernier (`Infinity`)

**Sanitization dans `buyOrders()`** :
- Strict : seuls les champs connus sont envoyés (pas de champs Firestore internes)
- `delivery` : uniquement les champs pertinents selon `delivery.status` et `delivery.type`
- `menu` : copie légère sans les extras/drinks du menu source

---

## ClientOrderCard.tsx

**Chemin** : `yaammoo/src/features/orders/components/ClientOrderCard.tsx`

**Props** :
| Prop | Type | Description |
|---|---|---|
| `order` | `Commande` | La commande à afficher |
| `onDelete` | `(id) => void` | Callback suppression |
| `onUpdateQuantity` | `(id, qty) => void` | Callback mise à jour quantité |
| `showActions` | boolean | Affiche les boutons d'action (défaut: false) |
| `hideRanking` | boolean | Cache le badge rank/quantité à droite (défaut: false) |
| `onPress` | `() => void` | Pression sur la carte |

**Optimisation** : wrappé dans `React.memo` — évite les re-renders inutiles.

**Affichage conditionnel (coin bas droit)** :
- `showActions = true` → bouton poubelle
- `hideRanking = true` → badge quantité `x{qty}`
- `status pending|processing` et `order.rank` défini → badge rank `"En attente • 3"`
- Sinon → badge quantité `x{qty}`

**Indicateur livraison** (icône coin bas gauche de l'avatar) :
- `express` → rouge `#dc2626`
- `time` → bleu `#2563eb`
- Autres → gris

**Animation vélo** (`BikeAnimation`) : affichée quand `status === 'delivering'`

---

## CartStatusPanel.tsx

**Chemin** : `yaammoo/src/features/orders/components/CartStatusPanel.tsx`

**Rôle** : Panneau de suivi des commandes (onglets pending/active/finished/delivered).

**Virtualisation** : utilise `FlatList` au lieu de `ScrollView` — seuls les items visibles sont rendus. La hiérarchie (groupes par boutique, sections jours précédents) est aplatie en un tableau d'items typés.

**Optimisations** :
- `React.memo` sur les sous-composants `GroupHeader` et `PastDateHeader`
- `useCallback` sur tous les handlers (toggleGroup, renderItem, etc.)
- Props FlatList : `removeClippedSubviews`, `maxToRenderPerBatch=20`, `windowSize=7`

---

## BikeAnimation.tsx

**Chemin** : `yaammoo/src/features/merchant/components/BikeAnimation.tsx`

**Rôle** : Animation de vélo (roues qui tournent, bobbing, route qui défile) utilisée dans les cartes de commande en livraison.

**Performance 100% thread natif** :
- Rotation des roues via `Animated.View` + `transform: rotate` avec `useNativeDriver: true`
- Bobbing et route via `Animated.View` avec `useNativeDriver: true`
- Cycle de rotation : `Animated.sequence([timing(0→360), timing(360→0, durée=0)])` dans un `Animated.loop`
- SVG des roues : `viewBox="-2 -2 18 18"` pour éviter la coupure du cercle aux bords du SVG
- Rayons avec `strokeLinecap="butt"` pour des extrémités nettes (pas d'arrondi qui dépasse)
- Les composants hors écran sont détruits par `FlatList` → aucune animation en arrière-plan

**Props** :
| Prop | Type | Défaut | Description |
|---|---|---|---|
| `paused` | boolean | false | Stoppe/nettoie toutes les animations |
| `hideLabel` | boolean | false | Cache le label "En route..." |

## DriverInfoTab.tsx

**Chemin** : `yaammoo/src/features/orders/components/DriverInfoTab.tsx`

**Rôle** : Tab « Livreur » affichée dans `OrderBottomSheet` (client) et
`MerchantOrderBottomSheet` (marchand). Visible si `status ∈ {delivering, delivered}`.

**Props** : `order: Commande`, `allowRating?: boolean` (défaut: true).

**Comportement** :
- Si `order.driverId` présent → `GET /driver/:driverId` (scope `public`/`merchant`/`self`)
- Si marchand livre lui-même → `GET /fastFood/:fastFoodId/delivery-stats` (scope `self`/`client`)
- `showRateBtn` affiché si `isDelivered && !!profile?.canRate` (indépendant de `driverId`)
- `submitRating` appelle `POST /driver/:driverId/rating` (livreur délégué uniquement)

**Affichage** :
- Haut : 2 InfoCards à gauche — identité + **Note** (juste `★ moyenne`, sans le
  nombre de votes) — + zone d'état à droite (QR ou BikeAnimation `paused` si livré).
- Bas : **cards stats individuelles** (titre 2 lignes + chiffre + label) — Cmd
  livré / en cours / en attente + **Nombre de vote** (`ratingCount`) — puis ligne
  de notation (étoiles + bouton commentaire + envoi).

**Overlay commentaire** : `Modal` transparent, blur plein écran en **fondu** piloté
par le clavier (`blurOpacity`), card blanche opaque qui remonte de façon **bornée**
(`interpolate [0,100] → [0,-90]`) — même logique que `CheckoutContactOverlay`.

**Loader d'envoi** : `submitRating` garde un délai minimum (600 ms via `Promise.all`)
pour que le spinner reste visible même si l'API répond instantanément.

**Cache + socket** (voir `ratingStatsCache`) : à la 1ʳᵉ ouverture → loader + GET ;
aux suivantes → affichage instantané depuis le cache + refetch silencieux. Écoute
`driverRatingUpdated` pour mettre `ratingAvg`/`ratingCount` à jour en direct.

## RateMenuTab.tsx

**Chemin** : `yaammoo/src/features/orders/components/RateMenuTab.tsx`

**Rôle** : Tab « Noter » — le client note le **plat** d'une commande livrée.
**Copie fidèle du design de `DriverInfoTab`**, adaptée au menu.

**Props** : `menuId`, `orderId`, `menuName`, `menuImage?` (fallback image depuis
la commande si le backend n'en renvoie pas).

**Chargement** : `GET /menu/:menuId/stats` (`ratingService.getMenuStats`) +
`GET /rating/order/:orderId` (pré-remplissage `menuRating`).

**Affichage** :
- Haut : InfoCards **Plat** + **Note** (`★ moyenne`) à gauche + **image réelle du
  plat** à droite (`expo-image`, `cachePolicy="memory-disk"`, `transition={0}` →
  pas de flash au remontage). Icône fast-food en dernier recours si aucune image.
- Bas : 3 cards stats individuelles — **Total plat** (`totalOrders`, popularité) /
  **Mes Cmd passées** (`myTotalOrders`) / **Nombre vote** (`ratingCount`).
- Notation identique à `DriverInfoTab` (étoiles + overlay commentaire + envoi 600 ms).

**Auto-notation** : si `scope === "self"` (marchand propriétaire du plat) → message
« Vous ne pouvez pas noter votre propre plat », pas de formulaire.

**Cache + socket** : idem `DriverInfoTab` mais clé `menu:menuId:orderId` et écoute
`menuRatingUpdated`.

**Envoi** : `POST /menu/:menuId/rating` (`ratingService.rateMenu`) — le backend
émet `menuRatingUpdated`.

## ratingService.ts & ratingStatsCache.ts

**Chemin** : `yaammoo/src/features/orders/services/`

**ratingService** :
| Méthode | Endpoint | Description |
|---|---|---|
| `rateMenu(menuId, orderId, value, comment?)` | `POST /menu/:menuId/rating` | Noter un plat |
| `getMenuStats(menuId)` | `GET /menu/:menuId/stats` | Stats plat : `ratingAvg/Count`, `totalOrders`, `myTotalOrders`, `hasRated`, `canRate` (`MenuStatsProfile`) |
| `getMenuRatings(menuId)` | `GET /menu/:menuId/ratings` | Liste des avis d'un plat |
| `getDriverRatings(driverId)` | `GET /driver/:driverId/ratings` | Liste des avis d'un livreur |
| `getOrderRating(orderId)` | `GET /rating/order/:orderId` | Note existante (`menuRating` + `driverRating`) |

> Notation du **livreur** : `rateDriver` / `getDriverInfo` vivent dans
> `driverService` (feature `driver`), pas ici.

**ratingStatsCache** (module singleton, cache mémoire par `(kind, id, orderId)`) :
- `get/set` : sert le profil déjà chargé sans refaire de loader.
- `patchRating(kind, id, avg, count)` : maj de la note en direct (sockets).
- `invalidate(kind, id, orderId)` : purge après que l'user note (refetch propre).

## OrderBottomSheet.tsx

**Chemin** : `yaammoo/src/features/orders/components/OrderBottomSheet.tsx`

Bottom sheet détail d'une commande client. **4 tabs** : Livraison — Commandes — Livreur — Noter.

### Tab Livraison
- **Créneau** : mêmes valeurs que le marchand — "Sur place" (pas de `delivery.status`), "Express" (`type === 'express'`), ou `Période (heure)`
- **Carte droite** : s'adapte au type — vélo animé si `delivering`, icône storefront si "Sur place", flash si Express, clock si programmé
- **Note de livraison** + **Message vocal** (waveform + play/pause)

### Tab Commandes
- Même rendu que `MerchantOrderCommandesTab` : icônes 🍽️/➕/🥤, label type (MENU/EXTRA/BOISSON), prix en XAF, total "Total commande"
- Items scrollables dans une card arrondie (fond `#F9FAFB`, borderRadius 16)
- **Ligne Livraison** 🛵 (zone + prix, ou « Inclus ») affichée sous les items,
  avant le total — `zone`/`deliveryPrice` dérivés de `selectedOrder.delivery.zone`
  / `.prix`. Le `total` client **inclut déjà la livraison** ([useCheckout](checkout.md)),
  donc pas ajouté à nouveau (contrairement au marchand).

### Tab Livreur (`DriverInfoTab`)
Visible si `status === delivering || status === delivered`.
- Infos livreur (nom, note, stats) ou infos marchand si c'est lui qui livre
- **Notation** : bouton « Noter » apparaît si `profile?.canRate` (scope `public` pour livreur, `client` pour marchand)
- QR code (delivering) ou BikeAnimation + « Livré » (delivered)

### Tab Noter (`RateMenuTab`)
Visible si `status === delivered && menuId existe`.
- Image réelle du plat + stats (Total plat / Mes Cmd / Nombre vote) + notation
  (étoiles + commentaire). Design copié sur `DriverInfoTab`. Voir section dédiée.

**Navigation multi-commandes** (`allOrders`) : barre de pagination "Cmd 1, Cmd 2…" en bas, avec flèches si > 3 commandes.

---

## Statuts Commande

```
pendingToBuy  →  pending  →  processing  →  finished  →  delivering  →  delivered
                                                               ↑
                                               (lancé par le marchand)
cancelByUser / cancelByFastFood  (depuis n'importe quel statut)
```

**Files avec rank** : `pending` et `processing` uniquement.
