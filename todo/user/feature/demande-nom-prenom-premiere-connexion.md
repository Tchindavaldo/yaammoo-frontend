# Demander nom et prénom à la première connexion

À l'arrivée sur Home après authentification, si l'utilisateur n'a pas de `nom` /
`prenom` renseignés en base, afficher une modale bloquante qui les demande avant
de laisser accéder à l'app.

## Déclencheurs

[ ] Auth par numéro de téléphone (OTP) — première connexion = création de compte
[ ] Auth Apple — Apple ne renvoie le nom qu'au tout premier consentement, souvent vide ensuite
[ ] Auth email / mot de passe — création de compte
[ ] Cas général : compte existant mais `nom` ou `prenom` vide/null en base

## Comportement attendu

[ ] Vérification au chargement de Home, une fois le user chargé (pas avant)
[ ] Ne pas déclencher tant que le profil n'est pas récupéré (éviter le faux positif)
[ ] Modale non fermable (pas de dismiss, pas de retour arrière) tant que non rempli
[ ] Champs : prénom + nom, tous deux obligatoires, trim + longueur minimale
[ ] Validation : refuser vide, espaces seuls, caractères invalides
[ ] À la soumission : `updateUser()` puis mise à jour de l'AuthContext
[ ] Toast succès / erreur (voir [toast-auth-et-profil](../feature/toast-auth-et-profil.md))
[ ] Ne plus jamais réafficher une fois les champs renseignés

## Points d'attention

[ ] Google Sign-In fournit déjà le nom : ne pas afficher la modale dans ce cas
[ ] Apple peut renvoyer un nom au 1er login — le pré-remplir si disponible
[ ] Vérifier le nom exact des champs côté API avant d'implémenter
