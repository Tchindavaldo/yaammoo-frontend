# Afficher les messages d'erreur des champs lors des requêtes API

> FAIT le 15/11/2026 : `src/api/apiError.ts` (`apiErrorMessage`) lit le message du backend (texte ou erreurs de champs `[{ field, message }]`, une ligne par champ), puis le code HTTP (401/403/404/429/5xx) ou l'absence de réponse ; appliqué à tous les points qui lisaient `response.data.message`. Toasts de succès : connexion (Google, Apple, email, numéro), compte créé, profil mis à jour, statuts de commande (marchand, livreur) ; échec de statut : raison réelle en toast global depuis le contexte. Erreurs réseau globales : `OfflineBanner`.

[x] S'assurer que le frontend affiche bien les messages d'erreur des champs lors des requêtes API.
    - Vérifier l'affichage des erreurs de validation menu et order
    - Ajouter affichage d'erreurs si absent
