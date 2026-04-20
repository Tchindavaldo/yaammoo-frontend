# Auth — Authentification (Email/Password + Google)

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `app/(auth)/index.tsx` | Page login (UI + handlers) |
| `app/(auth)/register.tsx` | Page inscription |
| `app/(auth)/phone.tsx` | Login WhatsApp |
| `src/features/auth/services/authService.ts` | Appel GET /user/:uid (email login) |
| `src/features/auth/services/googleAuthService.ts` | Flow complet Google Sign-In |
| `src/features/auth/services/userFirestore.ts` | CRUD utilisateur (GET/POST/PUT /user) |
| `src/features/auth/context/AuthContext.tsx` | État global user + AsyncStorage |
| `src/api/config.ts` | apiUrl + Firebase config + Google Client IDs |

---

## Flow Email/Password

```
signInWithEmailAndPassword(Firebase)
        ↓
authService.getUserById(uid)  →  GET /user/:uid  [Bearer token]
        ↓
setUserData() → AuthContext + AsyncStorage
        ↓
router.replace("/(tabs)")
```

## Flow Google Sign-In

```
GoogleSignin.configure({ webClientId, androidClientId, iosClientId })
        ↓
GoogleSignin.hasPlayServices()
        ↓
GoogleSignin.signIn()  →  idToken
        ↓
signInWithCredential(Firebase)  →  firebaseUser
        ↓
userFirestore.getUser(firebaseUser)  →  GET /user/:uid  [Bearer token]
        ↓  (si null → création)
userFirestore.createUser(newUser, firebaseUser)  →  POST /user  [Bearer token]
        ↓
userFirestore.getUser()  →  fetch données créées
        ↓
setUserData() → AuthContext + AsyncStorage
        ↓
router.replace("/(tabs)")
```

---

## Requêtes API

| Service | Méthode | Endpoint | Auth |
|---|---|---|---|
| `authService.getUserById()` | GET | `/user/:uid` | Bearer token Firebase |
| `userFirestore.getUser()` | GET | `/user/:uid` | Bearer token Firebase |
| `userFirestore.createUser()` | POST | `/user` | Bearer token Firebase |
| `userFirestore.updateUser()` | PUT | `/user/:uid` | Bearer token Firebase |

**Important :** toutes les requêtes incluent le header `Authorization: Bearer <idToken>` requis par le middleware `firebaseAuth` du backend.

---

## Fixes appliqués (2026-04-20)

- `authService.ts` : ajout du Bearer token manquant sur GET /user/:uid
- `googleAuthService.ts` : ajout `androidClientId` dans `GoogleSignin.configure()`
- `googleAuthService.ts` : `fastFoodId` corrigé de `""` à `undefined` (type optionnel)
- `index.tsx` : catch de l'erreur avec variable pour afficher le message réel

---

## Codes d'erreur Firebase → messages utilisateur

| Code Firebase | Message à afficher |
|---|---|
| `auth/user-not-found` | Email non enregistré |
| `auth/wrong-password` | Mot de passe incorrect |
| `auth/invalid-email` | Email invalide |
| `auth/email-already-in-use` | Email déjà utilisé |
| `auth/weak-password` | Mot de passe trop faible |
| `auth/network-request-failed` | Erreur réseau |
| `auth/account-exists-with-different-credential` | Compte existant avec une autre méthode |
| `SIGN_IN_CANCELLED` | Connexion annulée (silencieux) |
| `PLAY_SERVICES_NOT_AVAILABLE` | Google Play Services requis |
