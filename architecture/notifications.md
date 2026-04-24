# Notifications — Frontend

Gestion des notifications côté client : récupération, affichage, push (FCM/Expo), deep-linking.

> Pour le backend (routes `/notification`, dispatcher, Firestore), voir [`BACKEND/architecture/notifications.md`](../../BACKEND/architecture/notifications.md).

---

## Tokens — détection hybride

Le hook **`useNotificationSetup.ts`** tente d'abord un `import('@react-native-firebase/messaging')` dynamique :
- Si disponible (dev build / production) → token **FCM natif** via `messaging().getToken()`.
- Sinon fallback (Expo Go) → `Notifications.getExpoPushTokenAsync({ projectId })` → token `ExponentPushToken[...]`.

Le backend identifie le format en tête du dispatcher. Le même code frontend fonctionne dans les deux environnements.

---

## NotificationContext

**`src/features/notifications/context/NotificationContext.tsx`**

### State
- `notifications: Notification[]` — toutes les notifs user (hydratées depuis `storage` au mount pour un affichage instantané)
- `loading, error` — fetch state
- `unreadCount: number` — dérivé via le helper `isNotifRead`

### Format `isRead`
Le champ `isRead` peut être **`boolean | string | string[]`** selon l'historique des données :
- `string[]` — **format actuel** (array des `userId` ayant lu — matche Firestore côté serveur, supporte les groupes de notifs partagées).
- `boolean` ou `string` — anciens formats encore tolérés côté client.

Le helper **`isNotifRead(notif, userId)`** exporté par le context unifie la lecture : tableau → `.includes(uid)`, string → `=== uid`, boolean → direct. Tous les composants UI (liste + sheet) utilisent `useNotifications().isRead` — pas de logique locale dupliquée.

### Methods
- `refresh(quiet?: boolean)` — fetch `/notification/user?userId=...` (flush la queue `markAsRead` d'abord, puis merge les reads optimistes encore en attente pour qu'ils ne soient pas écrasés par la réponse serveur). `quiet=true` = pas de `loading` visible.
- `markAsRead(id, idGroup)` — **update optimiste instantané** : ajoute `userId` dans le tableau `isRead` du state + cache storage (format array, comme le serveur), puis `PUT /notification/markAsRead` en arrière-plan. Si échec réseau → push dans la queue `notif_read_queue` (storage), rejouée au prochain `refresh()`. `pendingReadIdsRef` protège l'optimistic update contre l'écrasement par une réponse serveur lente.
- `addFromSocket(notif)` — injection directe d'une notif reçue via socket dans le state + cache, sans refetch. Utilisé par `useSocketEvents` sur l'event `newNotification`.
- `isRead(notif)` — wrapper mémoïsé autour de `isNotifRead(notif, userData.uid)`.

### Clés storage
- `notifications_cache` — snapshot de la liste (hydratation au mount).
- `notif_read_queue` — `[{id, idGroup?, userId}]` des `markAsRead` en attente de sync réseau.

### Fetch automatique
- **Fetch silencieux au login** (première hydratation depuis le backend après le cache storage).
- **Catch-up silencieux à chaque `socket.connect`** (app killed → push tap → démarrage, reprise après long background, reconnexion réseau) — déclenché par `useSocketEvents` via `refreshNotifications(true)`.
- **Event `isRead` socket** → `refreshNotifications(true)` silencieux (sync multi-device quand un autre appareil lit une notif).
- **Aucun refetch** sur push FCM ou `newNotification` socket — le socket injecte via `addFromSocket`, les pushs FCM foreground présentent une notif locale.
- **Pull-to-refresh manuel** = fetch explicite avec loader visible.

### Monté dans
`app/_layout.tsx` au niveau provider (après AuthProvider + OrderProvider).

---

## Hooks

### useNotifications
**`src/features/notifications/hooks/useNotifications.ts`**
Wrapper simple autour de `useNotificationContext()`. Exporté pour compat.

### useNotificationSetup
**`src/features/notifications/hooks/useNotificationSetup.ts`**

**Init**
- Demande les permissions Expo, enregistre le device.
- Récupère le token (FCM natif ou Expo Push selon disponibilité).
- Sync token backend : `PUT /user/:uid` avec `{ fcmToken }`.

**Gestion locale**
- Après sync, met à jour `userData.fcmTokens[]` dans AuthContext + AsyncStorage.
- Skip re-sync si token déjà dans le tableau.
- Fallback `unsentFcmToken` dans storage si erreur réseau.

**Foreground (app ouverte)**
- `addNotificationReceivedListener` : ne déclenche plus de refresh auto (la mise à jour de la liste passe par le socket `newNotification` → `addFromSocket`).
- **FCM natif foreground** : `messaging().onMessage()` intercepte les pushs FCM reçus app ouverte et déclenche `Notifications.scheduleNotificationAsync(...)` pour afficher une notif locale (canal `high_priority_channel` sur Android). **Pas de refresh non plus** — le socket s'en charge.
  - **Why:** en dev build / prod natif, FCM ne montre PAS de bannière OS quand l'app est au foreground (comportement standard Android/iOS). Sans ce relais, l'utilisateur ne voit rien alors qu'Expo Go affichait via son handler.
  - Listener nettoyé dans le cleanup du `useEffect`.

**Response (tap sur la notif)**
- `addNotificationResponseReceivedListener` → lit `data.route` ou le dérive du `type` → `router.push(route)`.

**Initial (app killed → ouverte via notif)**
- `getLastNotificationResponseAsync()` au setup → si présent, navigate vers la route.

---

## Routing helper

**`src/features/notifications/utils/notificationRouting.ts`**
- `getNotificationRoute(notif)` : si `notif.route` présent, le retourne tel quel (override backend). Sinon mapping par `type`.
- `getNotificationIcon(type)` : retourne le nom d'icône Ionicons selon le type.

### Mapping par `type`

| Type | Route (fallback si pas de `notif.route`) | Usage |
|---|---|---|
| `order_new` | `/(tabs)/boutique` | Marchand — nouvelle commande |
| `order_status` | `/(tabs)/cart?section=finished` | User — transitions statut (sauf processing) |
| `order_delivering` | `/(tabs)/cart?section=finished` | User — en livraison |
| `order_rank_top` | `/(tabs)/cart?section=pending` | User — rang top 5 |
| `order_cancel_by_user` | `/(tabs)/notifications` | Marchand — annulation client |
| `order_cancel_by_merchant` | `/(tabs)/notifications` | User — annulation marchand |
| `bonus` | `/(tabs)/cart?section=bonus` | User — bonus attribué |
| *(inconnu)* | `/(tabs)/notifications` | Fallback |

### Routes réelles émises par le backend (override via `notif.route`)

Le backend calcule la route précise selon la transition (plus fin que le type seul) :

| Transition (updateOrders) | Route envoyée |
|---|---|
| `pending → processing` | `/(tabs)/cart?section=active` |
| `processing → finished` | `/(tabs)/cart?section=finished` |
| `finished → delivering` | `/(tabs)/cart?section=finished` |
| `delivering → delivered` | `/(tabs)/cart?section=finished` |
| `* → cancelByUser` (→ marchand) | `/(tabs)/notifications` |
| `* → cancelByFastFood` (→ user) | `/(tabs)/notifications` |
| rankQueue top 5, file `pending` | `/(tabs)/cart?section=pending` |
| rankQueue top 5, file `processing` | `/(tabs)/cart?section=active` |

### Query param `?section=`

La page [`app/(tabs)/cart.tsx`](../app/(tabs)/cart.tsx) lit `useLocalSearchParams()` et bascule automatiquement sur l'onglet/section correspondant :

| `section` | Effet |
|---|---|
| `cart` | `currentTab = "cart"` (panier) |
| `pending` / `active` / `finished` / `delivered` | `currentTab = "status"` + `activeStatus = <section>` |
| `bonus` | `currentTab = "bonus"` (BonusScreen) |

---

## Composants UI

### NotificationItem
**`src/features/notifications/components/NotificationItem.tsx`**
- Notif compacte (titre + message 2 lignes)
- Icône dépend du type
- Indicateur non-lu + chevron-forward
- Tap → ouvre NotificationDetailSheet

### NotificationDetailSheet
**`src/features/notifications/components/NotificationDetailSheet.tsx`**
- Bottom sheet modal ultra-minimaliste (backdrop semi-opaque + sheet blanc arrondi).
- Layout : handle discret → ligne top (date + titre à gauche, chip "Voir la commande" à droite si orderAction) → message complet.
- Pas de bouton "Fermer" — tap backdrop ferme. Pas d'icône ronde, pas de cadre sur l'action.
- Chip "Voir la commande" (pilule primary-tintée) apparaît uniquement si notif liée à une commande (`orderId` ou type `order_*`).
- Tap chip → ferme sheet + `router.push(route)` via `getNotificationRoute`.

### Page Notifications
**`app/(tabs)/notifications.tsx`**
- Header absolute + BlurView : titre + unread count + bouton "Mark all as read"
- FlatList de `NotificationItem` avec `paddingTop: HEADER_HEIGHT` et **`progressViewOffset={HEADER_HEIGHT}`** pour que le spinner de pull-to-refresh soit visible sous le header (sinon masqué derrière le blur)
- Pull-to-refresh → `refresh()` avec loader natif visible
- Empty state : "Aucune notification"
- Intègre `NotificationDetailSheet`

---

## Data flow — exemples

### Commande nouvelle (client achète)
```
frontend: buyOrders() → POST /order/tabs
backend envoie push FCM + socket newNotification au marchand
frontend marchand (app ouverte) :
  - Expo Go : handler expo-notifications → bannière affichée
  - Dev build natif : messaging().onMessage() → scheduleNotificationAsync → bannière locale
  - socket newNotification → NotificationContext.addFromSocket(notif) (injection directe, pas de refetch)
  - /notifications mis à jour en temps réel
frontend marchand (app killed → tap push) :
  - Push OS ouvre l'app
  - getLastNotificationResponseAsync() → router.push('/(tabs)/boutique')
  - socket.connect() → handleConnect → refreshOrders + refreshMerchant + refreshNotifications (catch-up silencieux)
  - → la page cible a son contenu à jour avant même que l'utilisateur ne l'atteigne
```

### Rang top 5
```
backend rankQueue → push uniquement pour rank ≤ 5
frontend user : FCM reçu, tap → '/(tabs)/cart'
```

---

## Clés de design côté client

1. **NotificationContext centralisé** : évite les fetchs dupliqués entre composants.
2. **Compact + Detail** : la liste montre 2 lignes, le sheet montre le message complet + date + action.
3. **Deep-link par type** : jamais de route en dur dans les composants — toujours via `getNotificationRoute`.
4. **Token hybride transparent** : un seul code path Expo Go / Dev build / Prod.
5. **Offline-first markAsRead** : state + storage mis à jour instantanément (format array matchant le serveur), réseau en arrière-plan, queue persistante en cas d'échec. `pendingReadIdsRef` protège contre l'écrasement par un refresh serveur concurrent. Pas de spinner au click.
6. **Helper `isRead` unifié** : `isNotifRead` centralisé dans le context gère tous les formats historiques (boolean/string/array), tous les composants UI l'utilisent via `useNotifications().isRead` — zéro duplication.
7. **Catch-up socket-driven** : pull-to-refresh = fetch explicite utilisateur. Les fetchs automatiques (au login + à chaque reconnect socket) sont **silencieux** (pas de loader). Résultat : aucune UX-pollution par des spinners inattendus.
8. **Deep-link par section** : query param `?section=...` sur `/(tabs)/cart` pour cibler pending/active/finished/bonus sans créer de routes séparées.
