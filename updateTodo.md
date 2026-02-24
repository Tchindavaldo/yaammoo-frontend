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
