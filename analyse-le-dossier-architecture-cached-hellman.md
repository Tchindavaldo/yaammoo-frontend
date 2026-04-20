# Plan — Push notifications hybrides (Expo + FCM natif)

## Context

Après connexion, le token poussé par le frontend est au format **`ExponentPushToken[...]`** (obtenu via `Notifications.getExpoPushTokenAsync()`), mais le backend utilise **`firebase-admin.messaging().send()`** qui n'accepte que des tokens **FCM natifs bruts**. Résultat : l'appel `POST /notification` échoue avec :

```
"The registration token is not a valid FCM registration token"
```

**Constats clés de l'exploration :**
- Backend (`sendPushNotification.service.js:34`) : appelle `admin.messaging().send({ token })` sans aucune détection de format.
- Backend (`notifyOrderEvent.js:10`) : supporte déjà un tableau `fcmTokens` via `arrayUnion`.
- Frontend (`useNotificationSetup.ts:84`) : produit uniquement des tokens Expo.
- Aucune lib `@react-native-firebase/messaging` installée côté frontend.
- `google-services.json` et `GoogleService-Info.plist` sont déjà présents → prêts pour FCM natif.

**Objectif (approche hybride choisie par l'utilisateur) :**
1. **Backend** : détecter automatiquement le format du token et router vers l'API Expo Push si c'est un `ExponentPushToken[...]`, sinon garder FCM natif. Marche immédiatement sans rebuild.
2. **Frontend** : installer `@react-native-firebase/messaging` pour pouvoir passer à de vrais tokens FCM en production (via prebuild + dev build), sans casser Expo Go.

---

## Partie 1 — Backend : détection hybride des tokens

### 1.1. Nouveau helper `sendExpoPushNotification.service.js`

**Fichier à créer** : `yaammoo-backend/src/services/notification/FCM/sendExpoPushNotification.service.js`

Responsabilités :
- Envoyer un POST à `https://exp.host/--/api/v2/push/send`
- Body : `{ to, title, body, data, sound: 'default', channelId: 'high_priority_channel', priority: 'high' }`
- Utiliser `node-fetch` ou `axios` (axios est déjà dans `firebase-admin` transitif, sinon ajouter)
- Retourner `{ success, response/error }` compatible avec la signature de `sendPushNotification`

### 1.2. Router dispatcher dans `sendPushNotification.service.js`

**Fichier à modifier** : `yaammoo-backend/src/services/notification/FCM/sendPushNotification.service.js`

Ajouter une détection en tête de fonction :
```js
if (typeof token === 'string' && token.startsWith('ExponentPushToken[')) {
  return sendExpoPushNotification({ token, title, body, data });
}
```
Puis garder le flux FCM natif existant (`admin.messaging().send(message)`) pour les tokens natifs.

### 1.3. Nettoyage des tokens invalides (bug existant)

**Fichier à modifier** : `yaammoo-backend/src/services/notification/helpers/notifyOrderEvent.js:23`

Le code actuel utilise `arrayRemove(...staleTokens)` avec spread, ce qui est correct en JS mais à vérifier — Firestore accepte plusieurs valeurs en varargs donc le spread est OK. **À confirmer** à la lecture, mais dans le cadre de ce plan on laisse tel quel si ça fonctionne déjà.

Par contre, on étend `cleanStaleTokens` pour être appelé quand l'API Expo retourne `DeviceNotRegistered` (réponse Expo Push) OU quand FCM retourne `messaging/registration-token-not-registered`. Ajouter la logique de cleanup dans `postNotification.service.js` après `Promise.allSettled` en parcourant les résultats.

---

## Partie 2 — Frontend : préparer le passage FCM natif (production)

### 2.1. Installation

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

**Fichier à modifier** : `yaammoo-frontend/app.json`

Ajouter dans `plugins` :
```json
"@react-native-firebase/app",
["@react-native-firebase/messaging", { "android": { "googleServicesFile": "./google-services.json" } }]
```

### 2.2. Token hybride dans `useNotificationSetup.ts`

**Fichier à modifier** : `yaammoo-frontend/src/features/notifications/hooks/useNotificationSetup.ts`

Stratégie dans `registerForPushNotificationsAsync` :
1. Tenter `import('@react-native-firebase/messaging')` en dynamique (try/catch).
2. Si disponible (dev build / production) → `await messaging().requestPermission()` + `await messaging().getToken()` → renvoie un **vrai token FCM**.
3. Sinon fallback actuel → `Notifications.getExpoPushTokenAsync({ projectId })` (Expo Go).

Avantage : le même code marche en Expo Go (token Expo) et en dev build (token FCM natif), sans toucher l'UX.

### 2.3. Rien à changer côté `syncToken`

Le backend accepte déjà le champ `fcmToken` via `PUT /user/:uid` (`userService.js:67-72`) et l'ajoute au tableau `fcmTokens` via `arrayUnion`. Le format du token n'a aucune importance pour le stockage — seulement pour l'envoi.

---

## Partie 3 — Tests de bout-en-bout

### 3.1. Test backend seul (curl)

```bash
# Test token Expo → doit passer par l'API Expo Push
curl -X POST http://localhost:5000/notification \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[yDsCc4LSq6IXddLUgCBsX9]","title":"Test","body":"Hello"}'

# Test token FCM natif → doit passer par firebase-admin
curl -X POST http://localhost:5000/notification \
  -H "Content-Type: application/json" \
  -d '{"token":"<vrai_token_fcm>","title":"Test","body":"Hello"}'
```

### 3.2. Test frontend + backend

1. Se connecter dans l'app (email/password).
2. Vérifier dans les logs : `Expo Push Token: ExponentPushToken[...]` (ou FCM si dev build).
3. Vérifier dans Firestore que `users/{uid}.fcmTokens` contient le token.
4. Créer une commande → le marchand doit recevoir une push.
5. Accepter la commande côté marchand → l'utilisateur doit recevoir une push.

### 3.3. Vérifier le cleanup

- Désinstaller l'app sur un device.
- Pousser une notif via l'API → la lib (Expo ou FCM) retourne `DeviceNotRegistered` → backend doit retirer le token de `fcmTokens` via `arrayRemove`.
- Vérifier dans Firestore que le tableau est bien nettoyé.

---

## Fichiers critiques

### Backend (à créer/modifier)
- `yaammoo-backend/src/services/notification/FCM/sendExpoPushNotification.service.js` *(nouveau)*
- `yaammoo-backend/src/services/notification/FCM/sendPushNotification.service.js` *(dispatcher)*
- `yaammoo-backend/src/services/notification/request/postNotification.service.js` *(cleanup tokens invalides)*
- `yaammoo-backend/package.json` *(ajouter `axios` si absent — déjà transitif mais à vérifier)*

### Frontend (à créer/modifier)
- `yaammoo-frontend/src/features/notifications/hooks/useNotificationSetup.ts` *(détection hybride)*
- `yaammoo-frontend/app.json` *(plugins FCM)*
- `yaammoo-frontend/package.json` *(2 nouvelles deps)*

### Réutilisations existantes
- `notifyOrderEvent.getUserTokens` (`notifyOrderEvent.js:5`) — déjà compatible tableau.
- `postNotificationService` (`postNotification.service.js:8`) — déjà compatible `tokens[]` via `sendPushToAll`.
- `admin.firestore.FieldValue.arrayUnion` / `arrayRemove` — déjà utilisés dans `userService.js:67` et `notifyOrderEvent.js:23`.

---

## Documentation à mettre à jour

- `yaammoo-frontend/architecture/notifications.md` : ajouter une section "Format des tokens" expliquant le dispatcher hybride.
- `yaammoo-frontend/updateTodo.md` : ajouter un check-in pour le suivi.
