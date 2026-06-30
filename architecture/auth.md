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

## Accès invité (Apple 5.1.1(v))

Apple exige que les fonctionnalités **non liées à un compte** (parcourir les
restaurants et menus) soient accessibles **sans inscription**. L'app applique
donc un modèle **invité → compte** :

- **Boot non connecté** → on entre directement dans `(tabs)` (home + recherche +
  consultation des menus). Plus de mur d'inscription. Cf. guard ci-dessous :
  `canEnterApp = authResolved && homeReady` (sans `isSignedIn`).
- **Action liée au compte** (ouvrir un menu pour commander, panier, profil,
  notifications) → on ouvre la **sheet d'auth** (Apple/Google/email) en overlay
  via `AuthGate`, au lieu d'exécuter l'action.

| Fichier | Rôle |
|---|---|
| `src/features/auth/context/AuthGateContext.tsx` | Provider + `useAuthGate()` → `requireAuth(action)` ouvre la sheet si invité, sinon exécute `action`. Rend la sheet d'auth en overlay (réutilise `AuthSheetContent`). |
| `src/features/auth/components/GuestGate.tsx` | Wrapper d'écran 100 % lié au compte (panier, profil, notifications, boutique) : affiche un CTA « Se connecter » → `requireAuth()`. |

**Points de gate** :
- `app/(tabs)/index.tsx` : `handleMenuClick` → `requireAuth()` avant d'ouvrir le
  CheckoutSheet (l'ouverture d'un menu mène à la commande).
- `app/(tabs)/cart.tsx`, `settings.tsx`, `notifications.tsx`, `boutique.tsx` :
  `GuestGate` en early-return si `!isSignedIn`.

`AuthGateProvider` est monté dans `app/_layout.tsx` autour de `AppContent` (sous
`FastFoodProvider`). La sheet se ferme automatiquement quand `isSignedIn` passe
à true.

**Bug Apple 2.1(a) corrigé** : le lien « Sign Up » de `AuthSheetContent` était un
`<Text>` non cliquable. Il est désormais cliquable et fonctionne **dans le même
sheet** (aucune navigation) : il bascule `AuthSheetContent` en mode inscription
email (`emailMode + isRegister`) — mêmes champs email/password que le login, mais
le bouton « Sign Up » **crée réellement le compte** (`createUserWithEmailAndPassword`
+ `POST /user` + `setUserData`), exactement comme un signup Google/Apple. Le footer
bascule alors en « Already have an account? Sign In » pour revenir au login.

## Navigation & gating (anti page-blanche)

La bascule entre `(auth)` et `(tabs)` est gérée par deux guards dans
`app/_layout.tsx`, **sans aucun `router.replace`** :

```
canEnterApp = authResolved && homeReady   // accès invité : plus de isSignedIn
guard (tabs) = canEnterApp
guard (auth) = !canEnterApp        // PAS de authResolved ici (cf. ci-dessous)
```

> **Note accès invité** : `isSignedIn` a été retiré de `canEnterApp` pour laisser
> les invités entrer dans `(tabs)`. Les fonctions liées au compte sont protégées
> au niveau de l'action via `AuthGate` (voir section « Accès invité » plus haut),
> pas au niveau de la navigation.

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
   Le fade n'est activé que si **deux** conditions sont réunies : `splashGone`
   (state réactif alimenté par `onSplashHidden` de `useHideSplash`) **et**
   `groupChanged` (le groupe de navigation a réellement changé entre deux rendus).
   Cela distingue « boot → home » (à ne pas animer) de « login → home » (à animer),
   alors que les deux vont pourtant vers `(tabs)`.

   > **Expo Go vs build natif** : en Expo Go, `expo-splash-screen` est géré plus
   > souplement, donc on peut voir un léger fondu splash → home au boot. En build
   > dev/preview/prod, le splash natif reste jusqu'au `hideAsync` → la 1re bascule
   > est une coupure nette (`none`), pas de fondu au boot. **Comportement voulu**
   > (pas de flash possible) ; ne pas chercher à le « corriger ».

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

**Loader jusqu'au démontage** : on ne ferme PAS le modal et on ne remet PAS
`isLoggingOut` à false sur succès — le loader tourne jusqu'à ce que le guard
démonte `settings` (comme une transition de login). Le modal de déconnexion est
en `animationType="none"` : sinon Android joue son fondu de fermeture et révèle
« settings nu » avant la transition de navigation vers `(auth)`.

## Suppression de compte

`confirmDelete()` (`settings.tsx`) appelle `AuthContext.deleteAccount()` qui fait
`signOut` + `setUser(null)` + `setUserData(null)` → **le guard bascule
automatiquement vers `(auth)`**. Mêmes règles que la déconnexion :

- Pas de `router.replace` ni d'`Alert` de succès : redirection pilotée par le guard.
- Loader plein jusqu'au démontage ; modal en `animationType="none"`.
- **Aucun `Alert` natif** : la validation du texte `SUPPRIMER` se fait via le
  bouton `disabled` ; les erreurs s'affichent **inline** dans le modal (state
  `deleteError`, effacé à la saisie / ouverture / annulation).

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
  `guard(auth) = !canEnterApp` (sans `authResolved`).

## Fixes appliqués (2026-06-23)

- **Flash de l'écran login pendant le fondu splash → home supprimé** : l'animation
  de bascule de groupe est conditionnelle (`splashGone && groupChanged ? "fade" : "none"`).
  Au boot (sous splash) → `none` ; transitions user (login → home, logout → auth) → `fade`.
  `useHideSplash` expose `isSplashHidden()` + `onSplashHidden()` (flag réactif).
- **Déconnexion & suppression de compte** : loader plein jusqu'au démontage,
  modals en `animationType="none"`, plus d'`Alert` natif (erreurs inline).
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
