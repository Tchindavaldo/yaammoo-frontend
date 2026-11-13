# Demander nom et prénom à la première connexion (IMPLÉMENTÉ)

IMPLÉMENTÉ par `ProfileNameSheet` (cf. architecture/profile-name-sheet.md) : carte
affichée sur le home si nom/prénom manquant, et imposée avant toute commande
(`requireName`). Seul écart : la carte reste fermable sur le home (elle est
bloquante uniquement avant une commande).

## Déclencheurs

[x] Auth par numéro de téléphone (OTP) — première connexion = création de compte
[x] Auth Apple — Apple ne renvoie le nom qu'au tout premier consentement, souvent vide ensuite
[x] Auth email / mot de passe — création de compte
[x] Cas général : compte existant mais `nom` ou `prenom` vide/null en base

## Comportement attendu

[x] Vérification au chargement de Home, une fois le user chargé (pas avant)
[x] Ne pas déclencher tant que le profil n'est pas récupéré (éviter le faux positif)
[ ] Modale non fermable (pas de dismiss, pas de retour arrière) tant que non rempli — fermable sur le home, imposée avant commande
[x] Champs : prénom + nom, tous deux obligatoires, trim + longueur minimale
[x] Validation : refuser vide, espaces seuls, caractères invalides
[x] À la soumission : `updateUser()` puis mise à jour de l'AuthContext
[x] Toast succès / erreur — erreur inline (voir [toast-auth-et-profil](../feature/toast-auth-et-profil.md))
[x] Ne plus jamais réafficher une fois les champs renseignés

## Points d'attention

[x] Google Sign-In fournit déjà le nom : ne pas afficher la modale dans ce cas
[x] Apple peut renvoyer un nom au 1er login — le pré-remplir si disponible
[x] Vérifier le nom exact des champs côté API avant d'implémenter
