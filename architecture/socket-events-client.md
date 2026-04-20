# Socket Events — Frontend (réception)

> Pour la liste des events émis par le backend, voir [`BACKEND/architecture/socket-events.md`](../../BACKEND/architecture/socket-events.md).

## Infrastructure client

- **Provider** : `src/features/socket/SocketContext.tsx` — instancie `io(Config.apiUrl)` + gère connexion/reconnexion.
- **Handlers globaux** : `src/services/useSocketEvents.ts` — hook monté dans `_layout.tsx` qui abonne le client aux events et dispatch vers les contexts (OrderContext, NotificationContext…).
- **Room** : dès que `AuthContext.userData.uid` est dispo, le client rejoint sa room `userId`.

---

## Événements reçus → actions

| Event reçu | Action client |
|---|---|
| `newUserOrder` | Ajoute la commande localement (OrderContext) |
| `userOrderUpdated` | `updateLocalOrder(order)` dans OrderContext |
| `newFastFoodOrder` / `newFastFoodOrders` | Alerte / badge + refresh panel marchand |
| `fastFoodOrderUpdated` | Met à jour la commande dans le panel marchand |
| `ordersRankUpdated` | Met à jour les ranks localement |
| `globalMenuUpdated` | `refreshFastFoods()` → recharge menus / boutiques |
| `newPeriodKeyDelivering` | Démarre le suivi de livraison |
| `removePeriodKeyDelivering` | Arrête le suivi de livraison |
| `newClientIdDelivering` | Identifie le livreur |
| `removeClientIdDelivering` | Retire l'identification livreur |
| `newNotification` | `NotificationContext.refresh(true)` — sync UI sans spinner |

---

## Rooms / authentification client

- Chaque appareil rejoint la room `userData.uid` à la connexion socket.
- Le marchand reçoit ses événements via la room dont l'id correspond à `fastfoods.userId` (même uid).
- Les events globaux (ex: `globalMenuUpdated`) arrivent indépendamment de la room.

## Reconnexion

- Sur reconnexion, re-join automatique de la room via un effet dans `SocketContext` écoutant `connect`.
- Tous les handlers restent montés via `useSocketEvents` pour éviter les abonnements orphelins.
