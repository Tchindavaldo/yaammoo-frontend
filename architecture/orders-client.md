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
    ├── OrderTrackingHeader.tsx # Header avec tracking statut
    └── OrderBottomSheet.tsx   # Bottom sheet détail d'une commande
```

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

## Statuts Commande

```
pendingToBuy  →  pending  →  processing  →  finished  →  delivering  →  delivered
                                                               ↑
                                               (lancé par le marchand)
cancelByUser / cancelByFastFood  (depuis n'importe quel statut)
```

**Files avec rank** : `pending` et `processing` uniquement.
