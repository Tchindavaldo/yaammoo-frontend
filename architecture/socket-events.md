# Socket Events — Yaammoo / Y0

## Infrastructure

- **Serveur** : `BACKEND/src/socket.js` — singleton `getIO()` retourne l'instance Socket.io
- **Client** : `yaammoo/src/features/socket/SocketContext.tsx` — Provider + connexion
- **Réception client** : `yaammoo/src/services/useSocketEvents.ts` — abonnements aux events

Les rooms socket sont basées sur les `userId` (client ou marchand). Un appareil rejoint sa room avec `socket.join(userId)`.

---

## Événements émis par le backend

### Commandes nouvelles

| Event | Destination | Émetteur (service) | Payload | Déclencheur |
|---|---|---|---|---|
| `newUserOrder` | `userId` client | `createOrder.js` controller | `{ message, data: order }` | Création commande |
| `newFastFoodOrder` | `userId` marchand | `createOrder.js` controller | `{ message, data: order }` | Création si statut ≠ `pendingToBuy` |
| `newFastFoodOrders` | `userId` marchand | `updateOrders.service.js` | `{ message, data: pendingOrders[] }` | Commandes passent à `pending` |

### Mises à jour commandes

| Event | Destination | Émetteur (service) | Payload | Déclencheur |
|---|---|---|---|---|
| `userOrderUpdated` | `userId` client | `updateOrders.service.js` | `{ data: order }` | Statut mis à jour (sauf `pending`) |
| `fastFoodOrderUpdated` | `userId` marchand | `updateOrders.service.js` | `{ data: order }` | Statut mis à jour (sauf `pending`) |
| `ordersRankUpdated` | `userId` marchand | `rankQueue.service.js` | `{ message, file, orders[] }` | Réindexation rang après sortie file |

### Livraisons

| Event | Destination | Émetteur (service) | Payload | Déclencheur |
|---|---|---|---|---|
| `newPeriodKeyDelivering` | client + marchand | `updateOrders.service.js` | `{ periodKey }` | Commande passe à `delivering` avec `periodKey` |
| `removePeriodKeyDelivering` | client + marchand | `updateOrders.service.js` | `{ periodKey }` | Commande passe à `finished` |
| `newClientIdDelivering` | client + marchand | `updateOrders.service.js` | `{ clientId }` | Commande passe à `delivering` avec `clientId` |
| `removeClientIdDelivering` | client + marchand | `updateOrders.service.js` | `{ clientId }` | Commande passe à `finished` |

### Menus / Stock

| Event | Destination | Émetteur (service) | Payload | Déclencheur |
|---|---|---|---|---|
| `globalMenuUpdated` | **tous** (`io.emit`) | `createOrder.js`, `updateOrders.service.js` | `{ message, menuId, menu }` | Stock décrémenté après commande `pending` |

---

## Réception côté client (useSocketEvents.ts)

**Chemin** : `yaammoo/src/services/useSocketEvents.ts`

| Event reçu | Action client |
|---|---|
| `newUserOrder` | Ajoute la commande localement |
| `userOrderUpdated` | `updateLocalOrder(order)` dans OrderContext |
| `newFastFoodOrders` | Alerte / notification (marchand) |
| `fastFoodOrderUpdated` | Met à jour commande dans le panel marchand |
| `ordersRankUpdated` | Met à jour les ranks localement |
| `globalMenuUpdated` | `refreshFastFoods()` → recharge les menus/boutiques |
| `newPeriodKeyDelivering` | Démarre le suivi de livraison |
| `removePeriodKeyDelivering` | Arrête le suivi de livraison |
| `newClientIdDelivering` | Identifie le livreur |
| `removeClientIdDelivering` | Retire l'identification livreur |

---

## Rooms et authentification

- Chaque utilisateur (client ou marchand) rejoint sa propre room via `socket.join(userData.uid)` à la connexion
- Le backend émet toujours vers un `userId` spécifique (`io.to(userId).emit(...)`) sauf pour `globalMenuUpdated` (`io.emit(...)` — broadcast à tous)
- Le `userId` du marchand est stocké dans le document `fastfoods` → champ `userId`
