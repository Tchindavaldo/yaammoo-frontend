# Notifications Module

## Overview
Complete notification system with dual channels (FCM push + Socket.io) supporting system notifications (in-app and out-of-app), deep linking by type, multi-device token management, and professional UI with expanded detail view.

## Architecture

### Backend Services
- **notifyOrderEvent.js** (`BACKEND/src/services/notification/helpers/notifyOrderEvent.js`)
  - Central helper for all order-related notifications
  - Fetches user's `fcmTokens` array from Firestore
  - Calls `postNotificationService` with `extraFcmData` (type, route, orderId)
  - Handles multi-device push distribution

- **postNotification.service.js** (`BACKEND/src/services/notification/request/postNotification.service.js`)
  - Extended to accept `tokens[]` and `extraFcmData` parameters
  - Sends FCM push to all device tokens in parallel
  - Emits socket `newNotification` for real-time UI sync when app is open
  - Creates Firestore notification doc for persistent history

### Notification Types & Routing
| Type | Source | Destination | Route |
|---|---|---|---|
| `order_new` | createOrder | merchant | `/(tabs)/boutique` |
| `order_status` | updateOrders | user | `/(tabs)/cart` |
| `order_cancel_by_user` | updateOrders | merchant | `/(tabs)/boutique` |
| `order_cancel_by_merchant` | updateOrders | user | `/(tabs)/cart` |
| `order_rank_top` | rankQueue (top 5) | user | `/(tabs)/cart` |
| `order_delivering` | updateOrders | user | `/(tabs)/cart` |

### Transitions & Notifications
**updateOrders.service.js** dispatches on these transitions:
- `pendingToBuy → pending`: notify merchant (order_new)
- `pending → processing`: notify user (order_status)
- `processing → finished`: notify user (order_status)
- `finished → delivering`: notify user (order_delivering)
- `delivering → delivered`: notify user (order_status)
- `* → cancelByUser`: notify merchant (order_cancel_by_user)
- `* → cancelByFastFood`: notify user (order_cancel_by_merchant)

### Rank Queue Notifications
**rankQueue.service.js** filters to top 5 orders only:
- Rank = 1: title = "🎉 Vous êtes le prochain !", body = "Votre commande va être traitée."
- Rank 2-5: title = "Votre commande avance", body = "Position {rank} dans la file..."

## Frontend Components & Hooks

### NotificationContext (`yaammoo/src/features/notifications/context/NotificationContext.tsx`)
**State**:
- `notifications: Notification[]` — all user notifications
- `loading, error` — fetch state
- `unreadCount: number` — computed from isRead flags

**Methods**:
- `refresh(quiet?: boolean)` — fetch from `/notification/user?userId=...`
- `markAsRead(id, idGroup)` — PUT `/notification/markAsRead` + optimistic update

**Mounted in**: `app/_layout.tsx` at provider level (alongside AuthProvider, OrderProvider)

### useNotifications Hook (`yaammoo/src/features/notifications/hooks/useNotifications.ts`)
Simple wrapper around `useNotificationContext()`. Exported for backward compatibility.

### useNotificationSetup Hook (`yaammoo/src/features/notifications/hooks/useNotificationSetup.ts`)
**Init**:
- Requests Expo permissions + registers device
- Gets Expo Push token via `getExpoPushTokenAsync()`
- Syncs token to backend via `PUT /user/{uid}` with `{ fcmToken }`

**Local State Management**:
- After sync, updates `userData.fcmTokens[]` in AuthContext memory + storage
- Skips re-sync on next launch if token already in array
- Falls back to `unsentFcmToken` storage on network error

**Foreground (app open)**:
- Listener: `addNotificationReceivedListener` → calls `refresh(true)` on NotificationContext
- Role: ensures `/notifications` page updates in real-time when socket is connected

**Response (tap)**:
- Listener: `addNotificationResponseReceivedListener` → reads `data.route` or derives from `type` → `router.push(route)`

**Initial (app killed)**:
- On setup: `getLastNotificationResponseAsync()` → if exists, navigate to route

### Routing Helper (`yaammoo/src/features/notifications/utils/notificationRouting.ts`)
- `getNotificationRoute(notif)`: returns route string per type
- `getNotificationIcon(type)`: returns Ionicons name per type

### UI Components

**NotificationItem** (`yaammoo/src/features/notifications/components/NotificationItem.tsx`)
- Displays compact notification (title + 2-line message)
- Icon changes per type
- Unread indicator + chevron-forward
- Tap opens NotificationDetailSheet

**NotificationDetailSheet** (`yaammoo/src/features/notifications/components/NotificationDetailSheet.tsx`)
- Bottom sheet modal (transparent backdrop + animated sheet)
- Full message (scrollable, no truncation)
- Formatted date ("il y a X min", "hier", etc.)
- Primary button "Voir la commande" (if type relates to order)
- Secondary "Fermer" button
- Tap "Voir..." closes sheet + navigates via `router.push(route)`

**Notifications Page** (`yaammoo/app/(tabs)/notifications.tsx`)
- Header: title, unread count, "Mark all as read" button
- FlatList of NotificationItem components
- Pull-to-refresh calls `refresh()`
- Empty state: "Aucune notification"
- Integrates NotificationDetailSheet modal

## Data Flow

### 1. New Order Created (User buys)
```
frontend: buyOrders() → POST /order/tabs
backend: createOrder.js → notifyOrderEvent({merchantUserId, type:'order_new', ...})
  → fetch merchant tokens from users/{uid}.fcmTokens
  → postNotificationService({tokens: [...], extraFcmData: {type, route, orderId}})
    → send FCM push to each token in parallel
    → create Firestore /notification doc
    → emit socket newNotification to merchantUserId
frontend (if app open): 
  - FCM system banner shown by OS
  - socket newNotification → NotificationContext.refresh(true)
  - /notifications page updates in real-time
frontend (if app closed):
  - FCM push arrives, tap → getLastNotificationResponseAsync() → route.push('/(tabs)/boutique')
```

### 2. Order Status Transition (Merchant accepts)
```
backend: updateOrders.service.js → pending → processing
  → buildTransitionNotif() → notifyOrderEvent({userId, type:'order_status', ...})
  → same flow as above, but targetUserId = order.userId (user), route = '/(tabs)/cart'
```

### 3. Rank Queue Update
```
backend: rankQueue.reindexQueue() → orders updated
  → filter to rank <= 5
  → map to notifyOrderEvent({userId, type:'order_rank_top', title/body per rank, ...})
  → push notifications only for top 5
```

## Files
- `BACKEND/src/services/notification/helpers/notifyOrderEvent.js` — central helper
- `BACKEND/src/services/notification/request/postNotification.service.js` — extended for tokens + socket
- `BACKEND/src/services/user/userService.js` — fcmTokens array with arrayUnion
- `BACKEND/src/controllers/user/userController.js` — removeFcmToken controller
- `BACKEND/src/routes/userRoutes.js` — DELETE /user/fcmToken route
- `BACKEND/src/services/order/createOrder.js` — merchant notification
- `BACKEND/src/services/order/updateOrders.service.js` — transition notifications
- `BACKEND/src/services/order/rankQueue.service.js` — top 5 notifications
- `yaammoo/src/features/notifications/context/NotificationContext.tsx` — provider
- `yaammoo/src/features/notifications/hooks/useNotifications.ts` — wrapper
- `yaammoo/src/features/notifications/hooks/useNotificationSetup.ts` — setup + sync + deeplink
- `yaammoo/src/features/notifications/utils/notificationRouting.ts` — routing + icons
- `yaammoo/src/features/notifications/components/NotificationItem.tsx` — compact list item
- `yaammoo/src/features/notifications/components/NotificationDetailSheet.tsx` — detail modal
- `yaammoo/app/(tabs)/notifications.tsx` — page with sheet integration
- `yaammoo/app/_layout.tsx` — NotificationProvider mount

## Key Design Decisions
1. **Dual Channel**: FCM for OS-level notifications + Socket for in-app real-time sync. Complementary, not redundant.
2. **Multi-Device**: `fcmTokens` array with `arrayUnion` allows user to receive on all registered devices.
3. **Stale Token Cleanup**: Automatic removal of invalid tokens via `arrayRemove` when FCM returns 'not-registered'.
4. **NotificationContext**: Centralized state eliminates duplicate API requests across components.
5. **Type-Based Routing**: Notification type determines navigation route; no hardcoding per component.
6. **Compact + Detail**: List shows 2 lines; sheet shows full message + formatted date + action button.
