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
(pas de router.replace) → le guard Stack.Protected révèle (tabs)
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
(pas de router.replace) → le guard Stack.Protected révèle (tabs)
```

> ⚠️ **Ne pas appeler `router.replace("/(tabs)")` après `setUserData()`.** La
> navigation est 100 % pilotée par les guards `Stack.Protected` de
> `app/_layout.tsx` (voir section suivante). Un `router.replace` impératif
> s'exécuterait avant que le guard soit prêt → groupe non monté → écran blanc.
> Sur succès, les handlers d'auth gardent le loader du bouton actif (pas de
> `setLoading(false)`) jusqu'à ce que l'écran soit démonté par le guard.

---

## Navigation & gating (anti page-blanche)

La bascule entre `(auth)` et `(tabs)` est gérée par deux guards dans
`app/_layout.tsx`, **sans aucun `router.replace`** :

```
canEnterApp = authResolved && isSignedIn && homeReady
guard (tabs) = canEnterApp
guard (auth) = !canEnterApp        // PAS de authResolved ici (cf. ci-dessous)
```

Trois signaux :
- **`authResolved`** = `!loading` (AuthContext) — Firebase a répondu.
- **`isSignedIn`** = `user && userData` — connecté avec profil.
- **`homeReady`** = `FastFoodContext.hasLoadedOnce` — le 1er fetch des restaurants
  est terminé (succès, liste vide **ou** erreur ; jamais de blocage infini).

Règles clés (chacune corrige un bug observé) :

1. **On n'entre dans `(tabs)` que lorsque `homeReady`.** Sinon la home se
   monterait vide → page blanche. Tant que ce n'est pas prêt, l'écran `(auth)`
   reste affiché avec le loader de son bouton → transition propre.
2. **`guard(auth)` n'inclut PAS `authResolved`.** Au login, `onAuthStateChanged`
   repasse `loading=true` (donc `authResolved=false`) pendant la re-vérif du
   profil ; si le guard auth dépendait de `authResolved`, les deux groupes
   seraient démontés en même temps → écran blanc. `!canEnterApp` garde toujours
   un écran monté.
3. **`WelcomeScreen` (`app/(auth)/index.tsx`) ne cache le splash que si
   `!loading && !isSignedIn`.** Évite de flasher l'écran de login au boot à froid
   quand l'utilisateur est déjà connecté (le splash reste jusqu'à la home).
4. **Animation conditionnelle au splash** : `screenAnimation = isSplashHidden() ? "fade" : "none"`
   (les deux écrans `(tabs)` et `(auth)` la partagent).
   - **Sous le splash** (boot, `isSplashHidden()` faux) : `none`. La 1re bascule de
     groupe (→ home si déjà connecté, → login sinon) a lieu pendant que le splash
     natif couvre l'écran. Un fondu ferait apparaître la cible par-dessus l'écran
     masqué → **flash de l'écran login**. Swap instantané = invisible.
   - **Splash caché** (transitions utilisateur) : `fade`. Sur login → home et
     logout → auth, fondu doux (même rendu que la disparition du splash).
   `isSplashHidden()` est un flag module exposé par `useHideSplash`, passé à `true`
   à la 1re `SplashScreen.hideAsync()` (déclenchée par l'`onLayout` de la home/login).

`FastFoodContext` expose pour cela `hasLoadedOnce` (passe à `true` dans le
`finally` du 1er `fetchFastFoods`, reste `true` ensuite même au pull-to-refresh).

## Déconnexion

`app/(tabs)/settings.tsx` : modal **custom** (pas d'`Alert` natif) avec loader
sur le bouton « Déconnecter » pendant l'opération.

```
confirmLogout()  →  setIsLoggingOut(true)
        ↓
POST /user/push-token/remove (best-effort)  →  signOut(Firebase)  →  setUserData(null)
        ↓
onAuthStateChanged → userData=null → guard (auth) → retour login (fondu)
```

Pas de `router.replace('/(auth)')` : le guard pilote le retour. `SettingItem`
accepte une prop `loading` (remplace le chevron par un `ActivityIndicator` et
désactive le press).

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

## Fixes appliqués (2026-06-21)

- **Page blanche après login supprimée** : navigation 100 % par guards
  `Stack.Protected` (suppression des `router.replace` manuels dans
  `AuthSheetContent`, `phone.tsx`, `register.tsx`, `settings.tsx`).
- `app/_layout.tsx` : `canEnterApp = authResolved && isSignedIn && homeReady` ;
  `guard(auth) = !canEnterApp` (sans `authResolved`) ; `animation: "fade"`.
- `FastFoodContext` : nouveau flag `hasLoadedOnce`.
- `app/(auth)/index.tsx` : splash caché seulement si `!loading && !isSignedIn`.
- `settings.tsx` : modal custom de déconnexion + loader sur le bouton.
- `SettingItem` : prop `loading`.

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
