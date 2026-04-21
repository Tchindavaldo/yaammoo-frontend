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
- `notifications: Notification[]` — toutes les notifs user
- `loading, error` — fetch state
- `unreadCount: number` — dérivé des flags `isRead`

### Methods
- `refresh(quiet?: boolean)` — fetch `/notification/user?userId=...`
- `markAsRead(id, idGroup)` — `PUT /notification/markAsRead` + optimistic update

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
- `addNotificationReceivedListener` → `refresh(true)` sur NotificationContext.
- Permet à la page `/notifications` de se mettre à jour en temps réel (couplé au socket).
- **FCM natif foreground** : `messaging().onMessage()` intercepte les pushs FCM reçus app ouverte et déclenche `Notifications.scheduleNotificationAsync(...)` pour afficher une notif locale (canal `high_priority_channel` sur Android).
  - **Why:** en dev build / prod natif, FCM ne montre PAS de bannière OS quand l'app est au foreground (comportement standard Android/iOS). Sans ce relais, l'utilisateur ne voit rien alors qu'Expo Go affichait via son handler.
  - Listener nettoyé dans le cleanup du `useEffect`.

**Response (tap sur la notif)**
- `addNotificationResponseReceivedListener` → lit `data.route` ou le dérive du `type` → `router.push(route)`.

**Initial (app killed → ouverte via notif)**
- `getLastNotificationResponseAsync()` au setup → si présent, navigate vers la route.

---

## Routing helper

**`src/features/notifications/utils/notificationRouting.ts`**
- `getNotificationRoute(notif)` : retourne la route string selon le `type`.
- `getNotificationIcon(type)` : retourne le nom d'icône Ionicons selon le type.

| Type | Route |
|---|---|
| `order_new` | `/(tabs)/boutique` |
| `order_status` | `/(tabs)/cart` |
| `order_cancel_by_user` | `/(tabs)/boutique` |
| `order_cancel_by_merchant` | `/(tabs)/cart` |
| `order_rank_top` | `/(tabs)/cart` |
| `order_delivering` | `/(tabs)/cart` |

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
- Bottom sheet modal (backdrop transparent + sheet animé)
- Message complet scrollable, non tronqué
- Date formatée ("il y a X min", "hier"…)
- Bouton primaire "Voir la commande" (si notif liée à une commande)
- Bouton secondaire "Fermer"
- Tap "Voir…" → ferme le sheet + `router.push(route)`

### Page Notifications
**`app/(tabs)/notifications.tsx`**
- Header : titre + unread count + bouton "Mark all as read"
- FlatList de `NotificationItem`
- Pull-to-refresh → `refresh()`
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
  - socket newNotification → NotificationContext.refresh(true)
  - /notifications mis à jour en temps réel
frontend marchand (app killed) :
  - Push arrive, tap → getLastNotificationResponseAsync() → router.push('/(tabs)/boutique')
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
