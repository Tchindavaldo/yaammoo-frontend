# Tâches terminées (archive)

[x] Gestion du stock des menus (tous les designs 1 à 7 + backend + bottom sheet).
    - Rendre le stock dynamique au lieu de hardcodé "40"
    - Ajouter champ stock au backend menuFields (obligatoire)
    - Ajouter prop stock à DesignItem et remplacer 40 par {stock} dans tous les designs
    - Ajouter champ stock au bottom sheet AddMenuSheetMultiStep (step stock)

[x] `DriverOrderPanel.tsx` — `relevantStatuses` réduit aux 3 exacts
    (`finished`/`delivering`/`delivered`).

## Corrections récentes (journal)

- Résolu le problème de flash/double loader lors de l'authentification Google.
- Arrière-plans blancs forcés pour éviter les conflits avec le thème sombre du téléphone.
- Loaders cohérents sur toutes les pages.
- Ajout Bearer token manquant sur `authService.getUserById()`.
- Ajout `androidClientId` dans `GoogleSignin.configure()`.
- Catch d'erreur avec variable dans login email pour afficher le vrai message.
