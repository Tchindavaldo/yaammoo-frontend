# Localisation de l'utilisateur

La position de l'utilisateur connecté est envoyée au backend, qui la garde dans
l'historique `user_locations` (seule table de localisation : rien sur `users`).
Sert au ciblage « Ma ville » des notifications boutique (voir
[merchant-broadcast.md](./merchant-broadcast.md)) et au marketing. Backend :
`BACKEND/architecture/user-location.md`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/features/location/hooks/useUserLocationSync.ts` | Permissions, capture au premier plan, limite de fréquence, lancement / arrêt du suivi arrière-plan |
| `src/features/location/tasks/backgroundLocationTask.ts` | Tâche app fermée (`expo-task-manager`) : position utilisateur + position livreur en mode livraison ; `start` / `stopBackgroundLocation`, `start` / `stopDeliveryTracking` |
| `src/features/location/tasks/trackingModes.ts` | Modes `normal` / `delivery` (persistés), réglages `startLocationUpdatesAsync` de chacun |
| `src/features/location/hooks/useCurrentPlaceLabel.ts` | Libellé « Quartier, Arrondissement » de la pilule du header home via Nominatim (OSM : `neighbourhood`/`suburb` + `city_district`), repli géocodeur du téléphone ; seulement si l'utilisateur est à Banganté (zone desservie), sinon « Banganté, Cameroun » en dur (idem sans permission ou en échec) |
| `src/features/location/hooks/useDeliveryTrackingSync.ts` | Livreur : mode livraison tant qu'une commande est `delivering` (monté par `DriverContext`) |
| `src/features/location/components/BackgroundLocationPromptCard.tsx` | Écran d'information avant la popup « Toujours » (copie R16 de `OtaUpdateCard`), monté dans `app/_layout.tsx` |
| `src/features/location/services/backgroundPrompt.ts` | Émetteur hook → carte (`requestBackgroundPrompt` / `onBackgroundPromptRequest`) |
| `src/features/location/utils/buildLocationPayload.ts` | Position + géocodage inverse → payload (partagé premier plan / tâche) ; `buildDriverPositionPayload` (sans géocodage) |
| `src/features/location/services/userLocationService.ts` | `POST /user/location` + types |
| `src/features/location/services/driverLocationService.ts` | `POST /driver/location` (livreur en course) → `{ activeDeliveries }` |
| `index.js` | Point d'entrée : importe la tâche **avant** `expo-router/entry` |
| `app/_layout.tsx` | Appelle `capture("login")` **après** le setup notifications |

## Quand

| Moment | `source` | Permission demandée ? | Limite |
|---|---|---|---|
| Connexion (chaque nouvel uid de la session, y compris au lancement déjà connecté) | `login` | « Pendant l'utilisation » si jamais demandée, puis « Toujours » (une seule fois) | aucune |
| Retour au premier plan | `foreground` | non | 30 min depuis le dernier envoi réussi |
| Tâche arrière-plan, app fermée ou en arrière-plan | `background` | — | 15 min et 300 m |
| Tâche arrière-plan, app ouverte | `foreground` | — | 15 min et 300 m |
| Livreur en course (mode livraison) | — (`POST /driver/location`) | « Pendant l'utilisation » à « Lancer » si jamais demandée | ~10 s et 15 m, envoi toutes les 8 s au plus |

- **Ordre des popups** : notifications → localisation « Pendant l'utilisation »
  → capture envoyée → **écran d'information** → « Toujours ». Jamais deux
  popups en même temps.
- **Écran d'information** (`BackgroundLocationPromptCard`) : même design que la
  carte OTA (carte sombre flottante au-dessus de la barre d'onglets, pastille,
  dégradé), texte qui dit de choisir « Toujours autoriser », boutons « Plus
  tard » / « Continuer ». « Continuer » ouvre la popup système ; « Plus tard »
  ne l'ouvre pas et, comme un refus, n'est jamais reproposé. Le hook attend la
  réponse via `requestBackgroundPrompt()` ; sans carte montée, la popup part
  directement.
- Refus : jamais redemandé par l'app (clé `user_location_bg_asked` pour
  « Toujours ») ; l'utilisateur peut l'activer dans les réglages système.
- Silencieux : ni loader ni toast ; un échec (GPS, hors ligne) est ignoré.
- **Déconnexion** (connecté → non connecté) : suivi arrêté. La tâche s'arrête
  aussi d'elle-même si elle ne trouve plus d'utilisateur Firebase.

## Suivi app fermée

- **Point d'entrée `index.js`** : Android lance la tâche sans monter
  l'interface ; définie dans un écran d'expo-router, elle ne serait jamais
  chargée.
- **Jeton** : la tâche peut tourner sans `setupHttp` ; elle attend
  `auth.authStateReady()` (session restaurée depuis AsyncStorage) et passe son
  propre Bearer à `userLocationService.send(payload, idToken)`.
- **Android** : en mode `normal`, sans service de premier plan, donc sans
  notification permanente ; l'OS bride la fréquence app fermée (quelques
  positions par heure). Le service de premier plan
  (`isAndroidForegroundServiceEnabled: true`) ne sert qu'au mode livraison.
- **iOS** : `pausesUpdatesAutomatically: false` — une pause iOS ne reprend
  qu'au retour de l'app au premier plan.
- **Expo Go / web** : non disponible (`backgroundLocationSupported`), seule la
  capture au premier plan tourne.

## Mode livraison (livreur en course)

Une seule tâche arrière-plan, deux réglages (`trackingModes.ts`), mode persisté
(`location_tracking_mode`) car la tâche tourne sans interface.

- **Déclenchement** : `useDeliveryTrackingSync(orders, loaded)` dans
  `DriverContext`. « Lancer » (→ `delivering`) et « Terminer » (→ `delivered`)
  de `DriverOrderCard` passent par `updateStatus`, qui met `orders` à jour :
  ≥ 1 commande `delivering` → `startDeliveryTracking()`, aucune →
  `stopDeliveryTracking()`. Suit aussi les events socket et la relance de
  l'app en pleine course. Rien avant le premier chargement (`loaded`) : une
  liste vide au démarrage couperait un suivi en cours.
- **Réglages** : `Accuracy.High`, 10 s / 15 m. Android : **service de premier
  plan** (notification « Livraison en cours »), démarré app ouverte (l'OS
  l'interdit sinon) ; iOS : indicateur bleu. Les deux suffisent avec
  « Pendant l'utilisation » — « Toujours » n'est pas exigé du livreur.
- **Envoi** : `POST /driver/location` (`buildDriverPositionPayload`, sans
  géocodage), au plus toutes les 8 s ; la position utilisateur continue en
  parallèle à son rythme (15 min). Réponse `activeDeliveries: 0` (courses
  closes ailleurs) → la tâche sort d'elle-même du mode livraison.
- **Sortie** : retour au mode `normal` si « Toujours » est accordé, arrêt
  sinon. La déconnexion arrête tout et remet le mode à `normal`.
- **Refus** de la localisation au « Lancer » : alerte unique (le client ne
  pourra pas suivre la course) ; la commande passe quand même en livraison.
- Backend : `BACKEND/architecture/geolocation.md`. Côté client : onglet
  « Suivi » ([orders-client.md](./orders-client.md)).

## Données envoyées

Coordonnées (`Accuracy.Balanced`), altitude, vitesse, cap + résultat de
`Location.reverseGeocodeAsync` (géocodeur du téléphone, sans clé d'API) : ville,
`subregion` (département), `region`, `district` (quartier), rue, numéro, nom du
lieu, adresse complète (Android), code postal, pays, fuseau (iOS). Les mesures
invalides (−1 d'iOS) sont omises, les textes bornés aux longueurs du backend.
Géocodage raté → coordonnées seules.

## Permissions (app.json → plugin `expo-location`)

- « Pendant l'utilisation » : suivi des livraisons + restaurants de la ville et
  leurs offres.
- « Toujours » : suivi en temps réel des livraisons en cours par les livreurs,
  même app fermée, + restaurants et offres de la ville.
- iOS : `UIBackgroundModes` `location` (et `fetch`, ajouté par
  `expo-task-manager`). Android : `ACCESS_BACKGROUND_LOCATION`, plus
  `FOREGROUND_SERVICE(_LOCATION)` (`isAndroidForegroundServiceEnabled: true`,
  mode livraison).
- ⚠️ Stores : la localisation arrière-plan est justifiée par le suivi des
  livraisons ; Google Play exige en plus le formulaire de déclaration
  (et une vidéo) dans la console. Risque de refus assumé.
- Tout changement exige une nouvelle build native (pas d'OTA).
