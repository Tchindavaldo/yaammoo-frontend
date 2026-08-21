# Versioning d'app dans les requêtes HTTP

Point d'architecture **transversal** : chaque requête envoyée au backend porte
la version du client. Le backend peut ainsi servir le bon format de réponse
selon la version de l'app (rétrocompat), router du comportement par plateforme,
ou diagnostiquer les bugs propres à une version.

> ⚠️ Ce mécanisme est **invisible depuis les call sites** : un simple
> `axios.get(...)` / `axios.post(...)` hérite des headers sans les mentionner.
> Ne cherche donc pas le header dans le code d'un appel précis — il est posé
> globalement ici.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/api/version.ts` | Source unique des métadonnées de version (`APP_VERSION`, `APP_BUILD`, `APP_PLATFORM`). |
| `src/api/setupHttp.ts` | Pose les headers globaux sur l'instance axios par défaut. |

### `src/api/version.ts`

- `APP_VERSION` — version publique, lue depuis `app.json` → `expo.version` via
  `expo-constants`. **`app.json` est le seul endroit à bumper** : aucune valeur
  en dur à maintenir en parallèle. Vide (avec `console.warn`) dans le cas
  anormal où `expo-constants` ne renvoie rien — le backend traite alors le
  client comme une version inconnue.
- `APP_BUILD` — build number iOS / versionCode Android (optionnel).
- `APP_PLATFORM` — `"ios" | "android" | "web"` (`Platform.OS`).

### `src/api/setupHttp.ts`

`setupHttp()` configure les headers envoyés à **CHAQUE** requête backend. Comme
tout le code utilise l'instance axios par défaut (`axios.get/post/...`), agir ici
couvre **tous** les appels existants ET futurs, sans toucher un seul call site.

Défense en profondeur (2 couches) :

1. **`axios.defaults.headers.common`** → header présent dès le boot, sur toute
   requête.
2. **Interceptor `request`** → filet de sécurité qui ré-injecte le header si une
   requête fournit ses propres headers (garantit qu'il n'est jamais perdu).

Headers posés :

| Header | Valeur |
|---|---|
| `x-app-version` | `APP_VERSION` |
| `x-platform` | `APP_PLATFORM` |
| `x-app-build` | `APP_BUILD` (seulement si défini) |

## Point d'entrée

`setupHttp()` est appelé **une fois au boot**, au niveau module dans
`app/_layout.tsx` (avant le rendu), donc les headers sont en place avant la
première requête.

## Portée

Le header couvre **toutes** les requêtes de l'app (les ~41 call sites), y compris
`GET /fastFood/all` (home), les appels bonus, orders, etc.

## Pourquoi (objectif principal)

Permettre de gérer les **mises à jour backend sans casser les anciennes apps
installées**. Le parc utilisateur n'est jamais tout à la même version (App Store
/ Play Store mettent du temps, certains ne mettent pas à jour) : quand le backend
évolue son schéma de réponse, il ne peut pas basculer tout le monde d'un coup.

Grâce à `x-app-version`, le backend sait à quelle version du client il répond et
**renvoie le payload adapté** :

- **ancienne version d'app** → ancien format de payload (celui qu'elle sait lire) ;
- **nouvelle version d'app** → nouveau format (champs enrichis).

Exemple concret : `deliveryHours` est servi en ancien format, OU en nouveau format
`{ deliveryHours, expressZones }`, selon la version portée par le header. L'app
reçoit donc toujours des données qu'elle sait interpréter, quelle que soit sa
version.

## Mise à jour forcée (`src/features/appVersion/`)

Utilise le même header pour bloquer les clients trop anciens, côté backend
`GET /settings/app-version` (public, table `settings` : `min_app_version` /
`latest_app_version`, jamais bloquant par défaut — repli `"0.0.0"`).

| Fichier | Rôle |
|---|---|
| `hooks/useAppVersionGate.ts` | Appelle `/settings/app-version` au boot, expose `{ forceUpdate, updateAvailable, minVersion, latestVersion, clientVersion }`. N'échoue jamais bloquant (erreur réseau → `gate = null`). |
| `context/AppVersionContext.tsx` | Provider seul point d'entrée du gate : appelle `useAppVersionGate` une fois, expose `{ gate, updateAvailable, forceUpdate, recheck }` aux écrans via `useAppVersion()`. |
| `components/ForceUpdateScreen.tsx` | Écran plein écran non fermable, monté à la place du `Stack` entier dans `app/_layout.tsx` quand `forceUpdate` est vrai. Le splash natif y est caché explicitement (le Stack n'étant pas monté, son `onLayout` ne pourrait pas le faire). |
| `components/UpdateAvailableSheet.tsx` | Modal dismissible ("Plus tard" / "Mettre à jour"), affichée **par-dessus le HomeScreen** (écran home, pas le layout racine) quand `updateAvailable` est vrai sans `forceUpdate`. Montée une fois le home peint → pas de page blanche entre le splash et le home. |
| `services/storeLinks.ts` | `openStorePage()` — ouvre le Play Store (`market://`, repli web) ou l'App Store (`https://apps.apple.com/app/id...`) selon `Platform.OS`. Utilise `Config.androidPackageName` / `Config.iosAppStoreId`. |

`Config.iosAppStoreId` (`src/api/config.ts`) est l'Apple ID numérique de l'app sur
l'App Store (APPSTORE_CONNECT.html), renseigné une fois l'app publiée.


## Gate de version — sequence apres le splash

Regle : **apres le splash, une seule destination s'affiche**, jamais l'une puis
l'autre.

- `AppVersionContext` expose `checked` (issu de `useAppVersionGate`), vrai des
  que le backend a repondu **ou a echoue** — un serveur injoignable ne bloque
  donc jamais le demarrage.
- `canEnterApp` inclut `versionChecked` : le `<Stack>` n'est monte qu'une fois
  le verdict connu. Sans ca le Stack se montait, la home cachait le splash, puis
  `forceUpdate` basculait a true → Stack demonte et remplace par l'ecran de
  blocage, laissant **une frame blanche** (constate sur Android, ou la reponse
  arrive apres le 1er rendu).
- **Un seul écran pour les deux cas** : `ForceUpdateScreen`, monté à la place du
  `<Stack>` — donc atteint **directement après le splash**, sans passer par la
  home. La prop `mandatory` ne change que le texte et la présence du bouton
  « Plus tard ». Il n'existe plus de second composant (`UpdateAvailableSheet` a
  été supprimé) : deux écrans pour un même propos, c'était deux choses à
  maintenir et deux rendus qui divergeaient.
  - `forceUpdate` → `mandatory={true}`, aucune issue.
  - `updateAvailable` → `mandatory={false}`, bouton « Plus tard ».
- Le splash est caché explicitement quand cet écran s'affiche : aucun écran du
  Stack ne peut le faire puisque le Stack n'est pas monté.
- **« Plus tard » n'est honoré que si `canEnterApp`** est vrai. Sinon le Stack se
  monterait sur un état incomplet et afficherait `(auth)` à nu — le splash étant
  déjà caché, l'utilisateur voyait le get-started en cliquant « Plus tard ».
  `hasLoadedOnce` passant à `true` dans un `finally`, le clic finit toujours par
  aboutir, même sur erreur réseau.
