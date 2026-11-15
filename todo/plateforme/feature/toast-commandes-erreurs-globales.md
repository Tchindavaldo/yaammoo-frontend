# Toasts : commandes et erreurs globales

> FAIT le 15/11/2026 : `src/api/apiError.ts` (`apiErrorMessage`) lit le message du backend (texte ou erreurs de champs `[{ field, message }]`, une ligne par champ), puis le code HTTP (401/403/404/429/5xx) ou l'absence de réponse ; appliqué à tous les points qui lisaient `response.data.message`. Toasts de succès : connexion (Google, Apple, email, numéro), compte créé, profil mis à jour, statuts de commande (marchand, livreur) ; échec de statut : raison réelle en toast global depuis le contexte. Erreurs réseau globales : `OfflineBanner`.

Audit de tous les points de requête de l'app : s'assurer que chaque appel réseau
affiche un message clair à l'utilisateur en cas de succès ET d'erreur.
Actuellement uniquement des `Alert.alert()` génériques — passer aux Toast.

[x] Création commande — success/erreur
[x] Mise à jour statut commande — feedback
[x] Erreurs réseau globales — Toast "Vérifiez votre connexion"
[x] Erreurs serveur 500 — Toast "Erreur serveur, réessayez"

## Mapping codes d'erreur Backend

```
401  → "Veuillez vous reconnecter"
403  → "Accès refusé"
404  → "Ressource non trouvée"
500  → "Erreur serveur, réessayez"
ECONNREFUSED → "Impossible de joindre le serveur"
```
