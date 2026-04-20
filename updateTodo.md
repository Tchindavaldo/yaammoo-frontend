# Update TODO

## Thème Sombre et Clair
- L'app force actuellement le mode clair (DefaultTheme) pour garantir des arrière-plans blancs constants.
- À l'avenir, implémenter une gestion complète des thèmes sombre/clair :
  - Ajouter un toggle dans les paramètres pour permettre à l'utilisateur de choisir.
  - Ajuster les couleurs des composants pour s'adapter au thème sélectionné.
  - Tester sur tous les écrans (Home, Panier, Notifications, Boutique, Settings).
  - S'assurer que les arrière-plans et textes restent lisibles dans les deux modes.

## Corrections Récentes
- Résolu le problème de flash/double loader lors de l'authentification Google.
- Arrière-plans blancs forcés pour éviter les conflits avec le thème sombre du téléphone.
- Loaders cohérents sur toutes les pages.
- Ajout Bearer token manquant sur `authService.getUserById()`.
- Ajout `androidClientId` dans `GoogleSignin.configure()`.
- Catch d'erreur avec variable dans login email pour afficher le vrai message.

## TODO — Messages utilisateur (Toast)

Audit de tous les points de requête de l'app : s'assurer que chaque appel réseau
affiche un message clair à l'utilisateur en cas de succès ET d'erreur.
Actuellement uniquement des `Alert.alert()` génériques — passer aux Toast.

### Niveaux de requêtes à traiter

**Auth (app/(auth)/)**
- [ ] Email login — success : Toast "Connecté avec succès"
- [ ] Email login — erreur Firebase : mapper les codes (`auth/wrong-password` → "Mot de passe incorrect", etc.)
- [ ] Google login — success : Toast "Connecté avec succès"
- [ ] Google login — erreur : messages spécifiques par code d'erreur
- [ ] Inscription — success/erreur : feedback clair

**Profil utilisateur (src/features/auth/services/userFirestore.ts)**
- [ ] `getUser()` — erreur 404 : Toast "Utilisateur non trouvé"
- [ ] `createUser()` — success : Toast "Profil créé"
- [ ] `createUser()` — erreur : Toast avec message
- [ ] `updateUser()` — success : Toast "Profil mis à jour"
- [ ] `updateUser()` — erreur : Toast avec message

**Commandes / Store / Autres (à compléter au fur et à mesure)**
- [ ] Création commande — success/erreur
- [ ] Mise à jour statut commande — feedback
- [ ] Erreurs réseau globales — Toast "Vérifiez votre connexion"
- [ ] Erreurs serveur 500 — Toast "Erreur serveur, réessayez"

### Mapping codes d'erreur Firebase
```
auth/user-not-found              → "Email non enregistré"
auth/wrong-password              → "Mot de passe incorrect"
auth/invalid-email               → "Email invalide"
auth/email-already-in-use        → "Email déjà utilisé"
auth/weak-password               → "Mot de passe trop faible"
auth/network-request-failed      → "Erreur réseau"
```

### Mapping codes d'erreur Backend
```
401  → "Veuillez vous reconnecter"
403  → "Accès refusé"
404  → "Ressource non trouvée"
500  → "Erreur serveur, réessayez"
ECONNREFUSED → "Impossible de joindre le serveur"
```
