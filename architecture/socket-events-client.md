# Socket Events — Frontend (réception)

> Pour la liste des events émis par le backend, voir [`BACKEND/architecture/socket-events.md`](../../BACKEND/architecture/socket-events.md).

## Infrastructure client

- **Singleton socket** : `src/services/socket.ts` — instancie `io(Config.apiUrl)` une seule fois au chargement du module (`socketService.getSocket()`).
- **Handlers globaux** : `src/services/useSocketEvents.ts` — hook monté dans `_layout.tsx` qui abonne le client aux events et dispatch vers les contexts (OrderContext, NotificationContext, MerchantContext, FastFoodContext).
- **Room** : dès que `AuthContext.userData.uid` est dispo, le client `emit('join_user', uid)` → rejoint sa room `userId` (côté backend).
- **Catch-up sur `connect`** : à chaque (re)connexion, le handler émet `join_user` puis appelle `refreshNotifications(true)`, `refreshOrders(true)`, `refreshMerchant(false)` en mode silencieux (pas de spinner) pour rattraper tout ce qui a pu être manqué pendant la déconnexion (app killed, background long, coupure réseau). `refreshFastFoods` n'est pas appelé car les menus sont rafraîchis par leurs events dédiés (`globalMenuUpdated`, `newFastFoodMenu`).

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
| `newNotification` | `NotificationContext.addFromSocket(notif)` — injection directe dans le state + cache, **pas de refetch** |
| `isRead` | `refreshNotifications(true)` — sync silencieux multi-device (un autre appareil a lu la notif) |
| `newFastFoodMenu` / `fastFoodMenuUpdated` | `refreshMerchant(false)` — menus marchand rechargés sans spinner |
| `newTransaction` | `refreshMerchant(false)` — MAJ wallet marchand |
| `newGlobalMenu` | `refreshFastFoods()` — liste restaurants rechargée |

---

## Rooms / authentification client

- Chaque appareil rejoint la room `userData.uid` à la connexion socket.
- Le marchand reçoit ses événements via la room dont l'id correspond à `fastfoods.userId` (même uid).
- Les events globaux (ex: `globalMenuUpdated`) arrivent indépendamment de la room.

## Reconnexion

- Sur reconnexion, re-join automatique via le handler `connect` dans `useSocketEvents` (émet `join_user`).
- Catch-up automatique des données (notifications, orders, merchant) en mode silencieux — voir section Infrastructure.
- Tous les handlers restent montés via `useSocketEvents` (effet dépendant de `[userData, socket]`) pour éviter les abonnements orphelins.

## Piège connu — backends multiples

Le client se connecte à `Config.apiUrl`. En dev local (`192.168.x.x:5000`), le socket est **isolé** du backend de prod (fly.io). Tester un `POST /notification/add` via curl sur la mauvaise URL n'émettra **aucun** event vers l'app. Vérifier `Config.apiUrl` avant tout debug socket.
