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
└── components/
    ├── ClientOrderCard.tsx    # Carte commande compacte (liste pending/processing)
    ├── OrderCard.tsx          # Carte commande détaillée (panier pendingToBuy)
    ├── OrderHeader.tsx        # Header de la page orders
    ├── OrderTrackingHeader.tsx # Stats (nb cmd / FF) + chips statut
    ├── CartStatusPanel.tsx    # Panneau suivi virtualisé (FlatList, groupes, jours passés, détail)
    ├── UserOrdersModal.tsx    # Modal plein écran « État des commandes » (Settings → Mes activités)
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

## Statuts Commande

```
pendingToBuy  →  pending  →  processing  →  finished  →  delivering  →  delivered
                                                               ↑
                                               (lancé par le marchand)
cancelByUser / cancelByFastFood  (depuis n'importe quel statut)
```

**Files avec rank** : `pending` et `processing` uniquement.
