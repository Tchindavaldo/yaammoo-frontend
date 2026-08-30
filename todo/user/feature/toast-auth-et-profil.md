# Toasts : authentification et profil

Audit de tous les points de requête de l'app : s'assurer que chaque appel réseau
affiche un message clair à l'utilisateur en cas de succès ET d'erreur.
Actuellement uniquement des `Alert.alert()` génériques — passer aux Toast.

## Auth (app/(auth)/)

- [ ] Email login — success : Toast "Connecté avec succès"
- [ ] Email login — erreur Firebase : mapper les codes (`auth/wrong-password` → "Mot de passe incorrect", etc.)
- [ ] Google login — success : Toast "Connecté avec succès"
- [ ] Google login — erreur : messages spécifiques par code d'erreur
- [ ] Inscription — success/erreur : feedback clair

## Profil utilisateur (src/features/auth/services/userFirestore.ts)

- [ ] `getUser()` — erreur 404 : Toast "Utilisateur non trouvé"
- [ ] `createUser()` — success : Toast "Profil créé"
- [ ] `createUser()` — erreur : Toast avec message
- [ ] `updateUser()` — success : Toast "Profil mis à jour"
- [ ] `updateUser()` — erreur : Toast avec message

## Mapping codes d'erreur Firebase

```
auth/user-not-found              → "Email non enregistré"
auth/wrong-password              → "Mot de passe incorrect"
auth/invalid-email               → "Email invalide"
auth/email-already-in-use        → "Email déjà utilisé"
auth/weak-password               → "Mot de passe trop faible"
auth/network-request-failed      → "Erreur réseau"
```
