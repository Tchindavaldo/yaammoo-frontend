# Toasts : authentification et profil

> FAIT le 15/11/2026 : `src/api/apiError.ts` (`apiErrorMessage`) lit le message du backend (texte ou erreurs de champs `[{ field, message }]`, une ligne par champ), puis le code HTTP (401/403/404/429/5xx) ou l'absence de réponse ; appliqué à tous les points qui lisaient `response.data.message`. Toasts de succès : connexion (Google, Apple, email, numéro), compte créé, profil mis à jour, statuts de commande (marchand, livreur) ; échec de statut : raison réelle en toast global depuis le contexte. Erreurs réseau globales : `OfflineBanner`.

[x] PARTIEL (vérifié le 14/11/2026) : erreurs déjà en toast/inline (`register.tsx`, `phone.tsx`,
    `AuthSheetContent`), mapping Firebase dans `auth/utils/authErrors.ts` et services Google/Apple.
    Manquent : toasts de succès (connexion, profil créé/mis à jour) et toasts de `userFirestore`.

Audit de tous les points de requête de l'app : s'assurer que chaque appel réseau
affiche un message clair à l'utilisateur en cas de succès ET d'erreur.
Actuellement uniquement des `Alert.alert()` génériques — passer aux Toast.

## Auth (app/(auth)/)

[x] Email login — success : Toast "Connecté avec succès"
[x] Email login — erreur Firebase : mapper les codes (`auth/wrong-password` → "Mot de passe incorrect", etc.)
[x] Google login — success : Toast "Connecté avec succès"
[x] Google login — erreur : messages spécifiques par code d'erreur
[x] Inscription — success/erreur : feedback clair

## Profil utilisateur (src/features/auth/services/userFirestore.ts)

[x] `getUser()` — erreur 404 : Toast "Utilisateur non trouvé"
[x] `createUser()` — success : Toast "Profil créé"
[x] `createUser()` — erreur : Toast avec message
[x] `updateUser()` — success : Toast "Profil mis à jour"
[x] `updateUser()` — erreur : Toast avec message

## Mapping codes d'erreur Firebase

```
auth/user-not-found              → "Email non enregistré"
auth/wrong-password              → "Mot de passe incorrect"
auth/invalid-email               → "Email invalide"
auth/email-already-in-use        → "Email déjà utilisé"
auth/weak-password               → "Mot de passe trop faible"
auth/network-request-failed      → "Erreur réseau"
```
