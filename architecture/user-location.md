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
| `src/features/location/tasks/backgroundLocationTask.ts` | Tâche app fermée (`expo-task-manager`), `start` / `stopBackgroundLocation` |
| `src/features/location/utils/buildLocationPayload.ts` | Position + géocodage inverse → payload (partagé premier plan / tâche) |
| `src/features/location/services/userLocationService.ts` | `POST /user/location` + types |
| `index.js` | Point d'entrée : importe la tâche **avant** `expo-router/entry` |
| `app/_layout.tsx` | Appelle `capture("login")` **après** le setup notifications |

## Quand

| Moment | `source` | Permission demandée ? | Limite |
|---|---|---|---|
| Connexion (chaque nouvel uid de la session, y compris au lancement déjà connecté) | `login` | « Pendant l'utilisation » si jamais demandée, puis « Toujours » (une seule fois) | aucune |
| Retour au premier plan | `foreground` | non | 30 min depuis le dernier envoi réussi |
| Tâche arrière-plan, app fermée ou en arrière-plan | `background` | — | 15 min et 300 m |
| Tâche arrière-plan, app ouverte | `foreground` | — | 15 min et 300 m |

- **Ordre des popups** : notifications → localisation « Pendant l'utilisation »
  → capture envoyée → « Toujours ». Jamais deux popups en même temps.
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
- **Android** : sans service de premier plan (`isAndroidForegroundServiceEnabled:
  false`), donc sans notification permanente ; l'OS bride la fréquence app
  fermée (quelques positions par heure).
- **iOS** : `pausesUpdatesAutomatically: false` — une pause iOS ne reprend
  qu'au retour de l'app au premier plan.
- **Expo Go / web** : non disponible (`backgroundLocationSupported`), seule la
  capture au premier plan tourne.

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
  `expo-task-manager`). Android : `ACCESS_BACKGROUND_LOCATION`.
- ⚠️ Stores : la localisation arrière-plan est justifiée par le suivi des
  livraisons ; Google Play exige en plus le formulaire de déclaration
  (et une vidéo) dans la console. Risque de refus assumé.
- Tout changement exige une nouvelle build native (pas d'OTA).
