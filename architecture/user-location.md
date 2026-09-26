# Localisation de l'utilisateur

La position de l'utilisateur connecté est envoyée au backend, qui garde
l'**historique** (`user_locations`) et la **dernière position** sur l'utilisateur
(`users.location_*`). Sert au ciblage « Ma ville » des notifications boutique
(voir [merchant-broadcast.md](./merchant-broadcast.md)) et, plus tard, au
marketing. Backend : `BACKEND/architecture/user-location.md`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/features/location/hooks/useUserLocationSync.ts` | Permission, position, géocodage inverse, envoi, limite de fréquence, retour au premier plan |
| `src/features/location/services/userLocationService.ts` | `POST /user/location` + types |
| `app/_layout.tsx` | Appelle `capture("login")` **après** le setup notifications |

## Quand

| Moment | `source` | Permission demandée ? | Limite |
|---|---|---|---|
| Connexion (chaque nouvel uid de la session, y compris au lancement déjà connecté) | `login` | oui, si jamais demandée | aucune |
| Retour au premier plan | `foreground` | non | 30 min depuis le dernier envoi réussi |

- **Ordre des popups** : la demande de localisation part dans le `.finally()`
  du setup notifications, jamais en même temps que sa popup.
- Refus : jamais redemandé par l'app (l'OS ne le permet plus de toute façon) ;
  l'utilisateur peut l'activer dans les réglages système.
- Silencieux : ni loader ni toast ; un échec (GPS, hors ligne) est ignoré.

## Données envoyées

Coordonnées (`Accuracy.Balanced`) + résultat de `Location.reverseGeocodeAsync`
(géocodeur du téléphone, sans clé d'API) : ville, `subregion` (département),
`region`, `district` (quartier), rue, code postal, pays. Géocodage raté →
coordonnées seules, le backend garde la dernière ville connue.

## Permission iOS

`NSLocationWhenInUseUsageDescription` (app.json) mentionne l'affichage des
restaurants de la ville **et leurs offres**. Un changement de ce texte exige une
nouvelle build native (pas d'OTA).

## Non fait : suivi app fermée

Aucune localisation en arrière-plan (`background`, `expo-task-manager`,
permission « Toujours »). Google Play et l'App Store n'autorisent la
localisation en arrière-plan que pour une fonction visible et utile à
l'utilisateur, pas pour le marketing : risque de refus en review.
