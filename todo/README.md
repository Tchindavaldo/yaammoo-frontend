# TODO — Organisation

Les tâches sont éclatées par **catégorie** (qui est concerné) puis par **type**.

Categories :
- `fastfood/` — côté marchand (boutique, menus, gestion des commandes)
- `user/` — côté client (home, panier, notifications, compte)
- `livraison/` — livraison, retrait, groupage, courses
- `plateforme/` — global / transverse (validation, perfs, thèmes, statuts)

Types de sous-dossiers :
- `bug/` — quelque chose ne fonctionne pas correctement
- `feature/` — nouvelle fonctionnalité ou gros changement de flux
- `ui-new/` — nouvelle UI à créer
- `ui-update/` — UI existante à ajuster

Un fichier = une tâche, au format `[ ]` (à faire) / `[x]` (fait). Une tâche entièrement faite est
DÉPLACÉE dans `done/` dès qu'elle est terminée : les dossiers ne contiennent
que du travail restant.
