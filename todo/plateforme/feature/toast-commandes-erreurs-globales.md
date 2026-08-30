# Toasts : commandes et erreurs globales

Audit de tous les points de requête de l'app : s'assurer que chaque appel réseau
affiche un message clair à l'utilisateur en cas de succès ET d'erreur.
Actuellement uniquement des `Alert.alert()` génériques — passer aux Toast.

[ ] Création commande — success/erreur
[ ] Mise à jour statut commande — feedback
[ ] Erreurs réseau globales — Toast "Vérifiez votre connexion"
[ ] Erreurs serveur 500 — Toast "Erreur serveur, réessayez"

## Mapping codes d'erreur Backend

```
401  → "Veuillez vous reconnecter"
403  → "Accès refusé"
404  → "Ressource non trouvée"
500  → "Erreur serveur, réessayez"
ECONNREFUSED → "Impossible de joindre le serveur"
```
