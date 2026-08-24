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

### Badge de l'icône d'application

Un `useEffect` du context appelle `Notifications.setBadgeCountAsync(unreadCount)`
à chaque variation du compteur. Piloté **là** et non à la réception d'un push :
le nombre de non-lus bouge aussi à la lecture, au refresh et au catch-up de
retour au premier plan — un badge posé seulement à la réception resterait figé.
L'appel échoue silencieusement sur les launchers Android incompatibles, ce n'est
pas une erreur à remonter au user.

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

### Garde-fous anti « la liste s'affiche puis disparaît »

- **Fetch conditionné à `userData.uid`** (et non à `userData` seul, qui peut arriver
  incomplet). Sans `uid`, la requête partait en `userId=undefined` : le backend répond
  `{success:true, data:[]}` — un tableau vide **bien formé** qui écrasait le state ET le
  cache storage. Le flag `didInitialFetchRef` est aussi conditionné à `uid`, sinon il était
  consommé trop tôt et le premier chargement n'avait jamais lieu ; il est **réarmé** à la
  déconnexion.
- **Hydratation storage non destructive** : `hasFreshDataRef` marque l'arrivée d'une donnée
  fraîche (réponse serveur ou `addFromSocket`). L'hydratation depuis le cache étant
  asynchrone, elle n'écrase plus le state si elle se résout après — et n'applique jamais un
  cache vide.
- **Réponse mal formée ignorée** : seul un `Array.isArray(response.data?.data)` déclenche le
  remplacement de la liste.

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
- Demande les permissions Expo (+ `PermissionsAndroid.POST_NOTIFICATIONS` sur Android 13+), enregistre le device.
- Récupère le token natif (`getDevicePushTokenAsync` — FCM sur Android, APNs hex sur iOS), fallback Expo Push si `EXPO_PUBLIC_USE_EXPO_PUSH=true`.
- Sync token backend : `POST /user/push-token/add` avec `{ token, platform, deviceId }` (Bearer du user courant).

**Gestion locale**
- Après sync, met à jour `userData.pushTokens[]` (`{ token, platform, deviceId, lastSeen }`) dans AuthContext + AsyncStorage (`user_data`).
- Skip re-sync si un token pour ce `deviceId` est déjà dans le tableau.
- Fallback `unsentFcmToken` dans storage si erreur réseau, rejoué au prochain `setup()`.
- `deviceId` = identifiant stable par installation (`src/features/notifications/services/deviceId.ts`, `expo-secure-store`) — survit aux relances, disparaît à la désinstallation. C'est la clé qui rattache un token à CE device, indépendamment du compte connecté.

**Déclenchement de `setup()`**
- `app/_layout.tsx` : à chaque connexion (`isSignedIn` + nouvel `user.uid`), relance `setupNotifications()` — pas de re-déclenchement si le même `uid` reste connecté.
- ⚠️ **Appel différé** (`NOTIF_SETUP_DELAY_MS` : 900 ms Android, 600 ms iOS). Au
  login, `isSignedIn` bascule pendant que la sheet d'auth est encore en train de
  redescendre ; la popup de permission gèle le thread UI et figeait l'animation
  à mi-course jusqu'à validation. Le timer laisse la transition se terminer.
- ⚠️ La **permission OS est globale à l'app, pas par compte**. Si un premier compte l'a accordée, un second compte connecté sur le même device en hérite automatiquement (l'OS ne redemande pas) — `setup()` retrouve alors `granted` direct et sync juste le token pour le nouveau `uid`.

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
| `bonus` | `/(tabs)/settings?section=bonus` | User — bonus éligible (ouvre UserBonusSheet) |
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
| `bonus` | `/settings?section=bonus` (ouvre UserBonusSheet dans Settings) |

---

## Icône de la barre de statut (Android)

Déclarée via le plugin `expo-notifications` dans `app.json` :

```json
["expo-notifications", {
  "icon": "./assets/images/logo-notification-white.png"
}]
```

**Contrainte Android** : l'icône de notification est traitée comme un **masque**
— seule la silhouette alpha est conservée, la couleur du fichier est ignorée.
Elle doit donc être **entièrement blanche sur fond transparent**. Sans cette
déclaration, Android retombe sur l'icône de l'app et affiche généralement un
carré blanc informe.

> `logo-notification-white-distinct.png` existe aussi dans `assets/images/` mais
> contient des pixels non blancs : ne pas l'utiliser pour ce rôle.

### Forme du dessin : compacte, jamais un mot

L'asset portait le logo « yaammoo » complet (ratio 2,6:1). Android inscrit
l'icône dans un **cercle** et la reduit jusqu'a ce que la largeur rentre : un
dessin aussi allonge finissait ecrase et illisible. L'asset porte donc
desormais le **« y » seul** (ratio 0,80, quasi carre), occupant ~2/3 du canevas
— la zone sure Android.

Le sourire du logo a ete essaye et **ecarte** : ratio 3,3:1, encore pire que le
mot entier.

### Generer l'asset

Source **vectorielle** (SVG du « y »), rendue en haute resolution puis reduite
sur un canevas carre de 512 px, dessin centre a 66 % de la largeur. Partir d'un
PNG deja pixelise donne des bords crenelés.

`expo prebuild` decoupe ensuite cet asset en **5 drawables fixes**
(`android/app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/notification_icon.png`,
24 → 96 px). Android ne redimensionne rien a l'affichage : il pioche la densite
de l'ecran. La densite utile maximale est donc 96 px — inutile de monter au-dela
de 512 px pour l'asset source.

> Verifier quelle version tourne reellement sur un appareil : comparer le md5
> des drawables de l'APK installe (`adb pull` du `base.apk`) avec ceux du
> projet. Les variantes se ressemblent trop pour se fier a l'œil.

### ⚠️ Le payload FCM prime, app fermee

**App ouverte**, c'est le JS (`expo-notifications`) qui construit la notif et
prend `default_notification_icon` du manifeste. **App fermee**, le JS ne tourne
pas : Android affiche directement le bloc `notification` du payload FCM, ou le
champ `icon` **ecrase** le defaut du manifeste.

Le backend doit donc envoyer `icon: 'notification_icon'` — voir
`BACKEND/architecture/notifications.md`. Il envoyait `ic_launcher`, opaque sur
toute sa surface : Android n'en gardait que l'alpha et affichait un **rond gris
uni**, uniquement app fermee.

> Consequence pour les tests : une icone qui s'affiche bien app ouverte ne prouve
> rien. Toujours tester **app en arriere-plan** (bouton home — pas
> `am force-stop`, qui bloque la reception FCM jusqu'au prochain lancement
> manuel).

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

### Switch « Notifications » — Settings
**`app/(tabs)/settings.tsx`**, section Préférences.

Reflète l'état **réel**, pas un booléen local :

```
ON  = permission OS "granted"  ET  un token pour CE deviceId existe dans userData.pushTokens
OFF = sinon (permission refusée, OU permission accordée mais token jamais synced pour ce device)
```

- **Lecture** : `useEffect` au montage + à chaque `navigation.addListener('focus', ...)` (retour depuis les réglages système) + à chaque changement de `userData` (switch de compte). Compare `Notifications.getPermissionsAsync()` et `getDeviceId()` contre `userData.pushTokens`.
- **Tap ON** : rejoue exactement le flux du premier lancement — `useNotificationSetup().setup()` (demande permission native + `syncToken` + màj `userData.pushTokens`) — puis relit l'état réel.
- **Tap OFF** : **purement visuel, non fonctionnel.** Aucune API OS (iOS/Android) ne permet à une app de révoquer sa propre permission de notification par code — seul l'utilisateur peut le faire depuis les réglages système. Décision produit : pas de redirection vers les réglages au tap OFF, le switch retombe simplement à OFF côté état local jusqu'au prochain re-calcul (focus/remount), qui le restaurera à ON si la BD/permission réelle dit toujours ON.
- **Cas multi-comptes sur un même device** : la permission OS est **globale à l'app**, pas par compte. Si le compte A l'a accordée puis qu'on se connecte avec le compte B sur le même téléphone, `setup()` (relancé par `_layout.tsx` à chaque nouvel `uid`) retrouve `granted` sans redemander à l'OS et attache directement le token de ce device au `pushTokens` de B. Le switch de B affichera donc ON même s'il n'a personnellement rien accepté — limite native, non contournable.

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
8. **Deep-link par section** : query param `?section=...` sur `/(tabs)/cart` (pending/active/finished) ou `/(tabs)/settings` (bonus/my-applications) pour cibler sans créer de routes séparées.
