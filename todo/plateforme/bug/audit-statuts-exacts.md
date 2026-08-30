# Audit des statuts exacts dans tout le projet

[ ] Auditer tout le projet (`grep` sur `completed|done|processing|active|in_progress`)
      et remplacer chaque liste multi-valeurs par le/les statut(s) exact(s).
    - statuts EXACTS du projet : `pending`, `finished`, `delivering`, `delivered`
    - fragile : un statut fantôme peut tomber dans la mauvaise catégorie
      (cf. bug livreur `finished` classé "En attente")
