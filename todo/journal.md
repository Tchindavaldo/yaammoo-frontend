# Journal des corrections récentes

- Résolu le problème de flash/double loader lors de l’authentification Google.
- Arrière-plans blancs forcés pour éviter les conflits avec le thème sombre du téléphone.
- Loaders cohérents sur toutes les pages.
- Ajout Bearer token manquant sur `authService.getUserById()`.
- Ajout `androidClientId` dans `GoogleSignin.configure()`.
- Catch d’erreur avec variable dans login email pour afficher le vrai message.
