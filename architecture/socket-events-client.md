# Socket Events — Frontend (réception)

> Pour la liste des events émis par le backend, voir [`BACKEND/architecture/socket-events.md`](../../BACKEND/architecture/socket-events.md).

## Infrastructure client

- **Singleton socket** : `src/services/socket.ts` — instancie `io(Config.apiUrl)` une seule fois au chargement du module (`socketService.getSocket()`).
- **Handlers globaux** : `src/services/useSocketEvents.ts` — hook monté dans `_layout.tsx` qui abonne le client aux events et dispatch vers les contexts (OrderContext, NotificationContext, MerchantContext, MerchantWalletContext, WalletContext, FastFoodContext).
- **Principe : injection directe du payload (pas de refetch).** Chaque event porte sa donnée complète (`data: order`, `menu`, `data: transaction`, `notification`, …). Le handler l'injecte dans le contexte via une méthode `upsert*FromSocket` / `remove*FromSocket` / `addFromSocket`. Aucun appel HTTP n'est déclenché par un event individuel.
- **Room** : dès que `AuthContext.userData.uid` est dispo, le client `emit('join_user', uid)` → rejoint sa room `userId` (côté backend).
- **Catch-up sur `connect` (seul refresh restant)** : à chaque (re)connexion, le handler émet `join_user` puis appelle `refreshNotifications(true)`, `refreshOrders(true)`, `refreshMerchant(false)`, `refreshDriver(false)` et `refreshBonuses(true)` en mode silencieux pour rattraper les events **fire-and-forget** manqués hors-ligne. Les events **fiabilisés** sont, eux, rejoués par le backend (replay + `__eventId` + ACK) — voir plus bas.

> ⚠️ `refreshBonuses` est indispensable au **deep-link depuis une notification push** : ouvrir l'app depuis la notif reconnecte le socket *après* l'event. Le rejeu ne couvre pas tout — `bonus.activation_changed` n'est pas fiabilisé, et `withAck` ignore un `__eventId` déjà vu dans la même session (app en arrière-plan puis rouverte). Sans ce refresh, la page bonus affiche l'état d'avant la notification.

- **Catch-up sur retour au premier plan (`AppState`)** : le `connect` seul ne suffit pas. L'OS (iOS surtout) gèle le JS en arrière-plan et peut couper la websocket **sans que socket.io s'en aperçoive** — au réveil la socket paraît vivante, aucun `connect` ne part, donc aucun rattrapage. Le listener `AppState` rejoue donc `catchUp()` au passage en `active` (ou force `socket.connect()` si le lien est mort, le `connect` qui suit s'en chargeant).

> C'est le cas concret des **identifiants reçus app en arrière-plan** : sans ce listener, taper la notification ramène l'app au premier plan mais la récompense n'apparaît pas. Une garde de 10 s (`CATCH_UP_COOLDOWN_MS`) évite la rafale de requêtes quand on bascule rapidement entre deux applications.

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
| `bonus.stats_updated` | `{ data: { bonusStats } }` | `BonusContext.applyBonusStats(bonusStats)` — solde de TOUS les bonus (map par id) |
| `bonus.claimed` | `{ data: {...} }` | `BonusContext.applyClaimPayload(data)` |
| `bonus.reward_credentials` | `{ data: {...} }` | `BonusContext.applyClaimPayload(data)` — récompense provisionnée (Netflix…) |
| `bonus.armed` / `bonus.disarmed` | `{ data: { bonusId, armed, disarmedBonusIds, deliveryOffer } }` | **Double** : `BonusContext.applyArmPayload(data)` **+** `FastFoodContext.applyDeliveryOffer(data.deliveryOffer)` |
| `bonus.redeemed` | `{ data: { bonusId, code, usageCount, usageLimit, remainingUses, redeemed, expiresAt } }` | `BonusContext.applyRedeemedPayload(data)` ; si épuisé, **+** `FastFoodContext.clearDeliveryOfferForBonus(bonusId)` |
| `bonus.created` | *(aucun payload)* | `BonusContext.refresh(true)` — **broadcast global**, seule exception au principe « pas de refetch » (rien à injecter) |
| `bonus.activation_changed` | `{ data: { bonusId, active, type, name, fastFoodId, fastFoodName, changedAt } }` | `BonusContext.applyActivationPayload(data)` ; si `active: false`, **+** `FastFoodContext.clearDeliveryOfferForBonus(bonusId)` — **broadcast global** (`io.emit`, pas de room) |

> **`bonus.armed` / `bonus.disarmed` — pourquoi deux appels.** Le payload est
> identique à la réponse HTTP de `POST`/`DELETE /bonus/:id/arm`. Le 1er appel met à
> jour l'état du bonus ; le 2nd propage `deliveryOffer` aux fastfoods du contexte —
> sans lui, la livraison offerte resterait invisible **au checkout** (qui lit
> `FastFoodContext`) jusqu'au prochain `GET /fastFood/all`. Détail de la portée :
> [`bonus.md`](bonus.md).
| `wallet.credited` | tous champs | `MerchantWalletContext.applyEvent` (patch solde, payin) |
| `wallet.withdrawal` | tous champs | `MerchantWalletContext.handleWithdrawalEvent` (patch solde + overlay) |
| `newNotification` | `{ notification }` | `NotificationContext.addFromSocket(notif)` |
| `isRead` | `{ notificationId }` | `refreshNotifications(true)` — sync silencieux multi-device |
| `newPeriodKeyDelivering` / `removePeriodKeyDelivering` | `{ periodKey }` | Suivi de livraison (log) |
| `newClientIdDelivering` / `removeClientIdDelivering` | `{ clientId }` | Identification livreur (log) |

> **Wallet marchand — pas de loader déclenché par un socket.** `applyEvent` patche
> le solde + la série du jour en local. Seul cas de refetch : si `stats===null`
> (boot non abouti), `applyEvent` appelle `refresh(false)` **silencieux** (sans
> `setLoading`) pour ne pas activer le loader natif du pull-to-refresh de
> `PorteFeuillePanel`. Après un retrait `completed`, l'overlay se ferme **sans**
> `refreshAll()` (le socket a déjà tout patché). Aucun autre contexte
> (`Order`, `Merchant`, `Wallet` client, `FastFood`, `Notification`) ne touche
> `setLoading` dans ses handlers `*FromSocket`.

### Events fiabilisés (replay) vs fire-and-forget

- **Fiabilisés** (persistés + rejoués à la reconnexion, avec `__eventId` et `__replay: true`) : `wallet.credited`, `wallet.withdrawal`, `payment.settled`, `newFastFoodOrders`, `userOrderUpdated`, `fastFoodOrderUpdated`, `newFastFoodMenu`, `fastFoodMenuUpdated`, `fastFoodMenuDeleted`, `bonus.reward_credentials`, `bonus.redeemed`. Le dédoublonnage est géré par `withAck` (`src/services/socketAck.ts`).
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

> ⚠️ **Un `socket.on` = un `socket.off` dans le cleanup.** L'effet rejoue à chaque
> changement de `userData`, et `socket.on` **empile** les handlers au lieu de les
> remplacer. Un event oublié dans le cleanup finit donc exécuté N fois : N ACK
> renvoyés pour le même `__eventId`, et les copies obsolètes travaillent sur un
> `userData` périmé (capturé en closure). Les 3 events bonus souffraient de ce
> défaut. Contrôle rapide, qui doit ne rien renvoyer :
>
> ```bash
> comm -23 <(grep -oP 'socket\.on\("\K[^"]+' src/services/useSocketEvents.ts | sort -u) \
>          <(grep -oP 'socket\.off\("\K[^"]+' src/services/useSocketEvents.ts | sort -u)
> ```

## Piège connu — backends multiples

Le client se connecte à `Config.apiUrl`. En dev local (`192.168.x.x:5000`), le socket est **isolé** du backend de prod (fly.io). Tester un `POST /notification/add` via curl sur la mauvaise URL n'émettra **aucun** event vers l'app. Vérifier `Config.apiUrl` avant tout debug socket.
