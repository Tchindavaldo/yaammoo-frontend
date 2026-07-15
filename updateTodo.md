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

## TODO — Statuts stricts (supprimer les listes fourre-tout)

Plusieurs endroits mappent **plusieurs valeurs possibles** pour un même statut au
lieu des **vraies valeurs exactes** du backend. C'est fragile (un statut fantôme
peut tomber dans la mauvaise catégorie, cf. bug livreur `finished` classé "En attente").

**Statuts EXACTS du projet :** `pending`, `finished`, `delivering`, `delivered`
(cycle livraison : `finished` = à livrer → `delivering` = en cours → `delivered` = terminé).

- [x] `DriverOrderPanel.tsx` — `relevantStatuses` réduit aux 3 exacts (`finished`/`delivering`/`delivered`).
- [ ] `merchant/components/OrderManagePanel.tsx` — `statusMap` (l.133) contient des
      variantes jamais émises (`processing`, `active`, `in_progress`, `completed`,
      `done`). Ne garder que les valeurs réellement produites par le backend.
- [ ] Auditer tout le projet (`grep` sur `completed|done|processing|active|in_progress`)
      et remplacer chaque liste multi-valeurs par le/les statut(s) exact(s).
- [ ] Idéalement : centraliser les statuts dans un seul type/enum (`OrderStatus`)
      pour interdire les valeurs fantômes à la compilation.

## TODO — Chargement paresseux (lazy loading) par interface

Au démarrage de l'app, ne charger QUE les données réellement affichées à l'écran,
pas celles des interfaces non visibles. Charger le reste à la demande.

- [ ] **Au lancement** : faire le `GET` UNIQUEMENT des **fastfoods du Home**.
      Ne PAS déclencher les `GET` des autres interfaces au boot.
- [ ] **Autres interfaces** (onglets/écrans non affichés à l'ouverture) : ne faire
      leur `GET` que **lorsqu'on y accède** (à l'entrée dans l'écran), pas avant.
- [ ] **Pendant le chargement** d'une interface : afficher un **loader** ou un
      **placeholder / fake data (skeleton)** en attendant les vraies données.
- [ ] Vérifier qu'aucun contexte global (Order/Socket/...) ne pré-charge tout au boot.
- [ ] Prévoir un composant skeleton/placeholder réutilisable.

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
