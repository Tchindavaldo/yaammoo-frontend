# Socket Events — Frontend (réception)

> Pour la liste des events émis par le backend, voir [`BACKEND/architecture/socket-events.md`](../../BACKEND/architecture/socket-events.md).

## Infrastructure client

- **Singleton socket** : `src/services/socket.ts` — instancie `io(Config.apiUrl)` une seule fois au chargement du module (`socketService.getSocket()`).
- **Handlers globaux** : `src/services/useSocketEvents.ts` — hook monté dans `_layout.tsx` qui abonne le client aux events et dispatch vers les contexts (OrderContext, NotificationContext, MerchantContext, MerchantWalletContext, WalletContext, FastFoodContext).
- **Principe : injection directe du payload (pas de refetch).** Chaque event porte sa donnée complète (`data: order`, `menu`, `data: transaction`, `notification`, …). Le handler l'injecte dans le contexte via une méthode `upsert*FromSocket` / `remove*FromSocket` / `addFromSocket`. Aucun appel HTTP n'est déclenché par un event individuel.
- **Room** : dès que `AuthContext.userData.uid` est dispo, le client `emit('join_user', uid)` → rejoint sa room `userId` (côté backend).
- **Catch-up sur `connect` (seul refresh restant)** : à chaque (re)connexion, le handler émet `join_user` puis appelle `refreshNotifications(true)`, `refreshOrders(true)`, `refreshMerchant(false)` en mode silencieux pour rattraper les events **fire-and-forget** manqués hors-ligne. Les events **fiabilisés** sont, eux, rejoués par le backend (replay + `__eventId` + ACK) — voir plus bas.

---

## Événements reçus → actions

Toutes les actions ci-dessous **injectent le payload directement** dans le contexte (pas de refetch).

| Event reçu | Payload | Action client |
|---|---|---|
| `newUserOrder` | `{ data: order }` | `OrderContext.upsertOrderFromSocket(data)` |
| `userOrderUpdated` | `{ data: order }` | `OrderContext.upsertOrderFromSocket(data)` |
| `userOrdersUpdated` | `{ orders: order[] }` | `OrderContext.upsertOrdersFromSocket(orders)` |
| `newFastFoodOrder` | `{ data: order }` | `MerchantContext.upsertOrderFromSocket(data)` |
| `newFastFoodOrders` | `{ data: order[] }` | `MerchantContext.upsertOrdersFromSocket(data)` |
| `fastFoodOrderUpdated` | `{ data: order }` | `MerchantContext.upsertOrderFromSocket(data)` |
| `fastFoodOrdersUpdated` | `{ orders: order[] }` | `MerchantContext.upsertOrdersFromSocket(orders)` |
| `ordersRankUpdated` | `{ orders: order[] }` | `MerchantContext.upsertOrdersFromSocket(orders)` |
| `newMenu` | `{ data: menu }` | `MerchantContext.upsertMenuFromSocket(data)` |
| `newFastFoodMenu` | `{ menu }` | `MerchantContext.upsertMenuFromSocket(menu)` |
| `fastFoodMenuUpdated` | `{ menuId, menu }` | `MerchantContext.upsertMenuFromSocket(menu)` |
| `fastFoodMenuDeleted` | `{ fastFood, menuId }` | `MerchantContext.removeMenuFromSocket(menuId)` |
| `newGlobalMenu` | `{ menu }` | `FastFoodContext.upsertMenuFromSocket(menu)` (normalisé) |
| `globalMenuUpdated` | `{ menuId, menu }` | `FastFoodContext.upsertMenuFromSocket(menu)` (normalisé) |
| `globalMenuDeleted` | `{ fastFood, menuId }` | `FastFoodContext.removeMenuFromSocket(ffId, menuId)` |
| `newFastfood` | `{ fastFood }` | `FastFoodContext.upsertFastFoodFromSocket(fastFood)` (normalisé) |
| `newTransaction` | `{ data: transaction }` | `WalletContext.upsertTransactionFromSocket(data)` (page transactions client) |
| `wallet.credited` | tous champs | `MerchantWalletContext.applyEvent` (patch solde, payin) |
| `wallet.withdrawal` | tous champs | `MerchantWalletContext.handleWithdrawalEvent` (patch solde + overlay) |
| `newNotification` | `{ notification }` | `NotificationContext.addFromSocket(notif)` |
| `isRead` | `{ notificationId }` | `refreshNotifications(true)` — sync silencieux multi-device |
| `newPeriodKeyDelivering` / `removePeriodKeyDelivering` | `{ periodKey }` | Suivi de livraison (log) |
| `newClientIdDelivering` / `removeClientIdDelivering` | `{ clientId }` | Identification livreur (log) |

### Events fiabilisés (replay) vs fire-and-forget

- **Fiabilisés** (persistés + rejoués à la reconnexion, avec `__eventId` et `__replay: true`) : `wallet.credited`, `wallet.withdrawal`, `payment.settled`, `newFastFoodOrders`, `userOrderUpdated`, `fastFoodOrderUpdated`, `newFastFoodMenu`, `fastFoodMenuUpdated`, `fastFoodMenuDeleted`. Le dédoublonnage est géré par `withAck` (`src/services/socketAck.ts`).
- **Fire-and-forget** (non rejoués) : `globalMenu*`, `*PeriodKey*`, `*ClientId*`, `ordersRankUpdated`. C'est pour eux que le refresh global au `connect` sert de filet de sécurité.

---

## Rooms / authentification client

- Chaque appareil rejoint la room `userData.uid` à la connexion socket.
- Le marchand reçoit ses événements via la room dont l'id correspond à `fastfoods.userId` (même uid).
- Les events globaux (ex: `globalMenuUpdated`) arrivent indépendamment de la room.

## Reconnexion

- Sur reconnexion, re-join automatique via le handler `connect` dans `useSocketEvents` (émet `join_user`).
- Catch-up silencieux (notifications, orders, merchant) pour les events fire-and-forget — voir section Infrastructure. Les events fiabilisés sont rejoués par le backend.
- Tous les handlers restent montés via `useSocketEvents` (effet dépendant de `[userData, socket, isMarchand]`) pour éviter les abonnements orphelins.

## Piège connu — backends multiples

Le client se connecte à `Config.apiUrl`. En dev local (`192.168.x.x:5000`), le socket est **isolé** du backend de prod (fly.io). Tester un `POST /notification/add` via curl sur la mauvaise URL n'émettra **aucun** event vers l'app. Vérifier `Config.apiUrl` avant tout debug socket.
