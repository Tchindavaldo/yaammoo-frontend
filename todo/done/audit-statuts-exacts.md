# Audit des statuts exacts dans tout le projet

[x] (vérifié le 14/11/2026) Auditer tout le projet et remplacer chaque liste
      multi-valeurs par le/les statut(s) exact(s).
    - statuts EXACTS (base de test + `orderFields.js` backend) : `pendingToBuy`,
      `pending`, `processing`, `finished`, `delivering`, `delivered`,
      `cancelByUser`, `cancelByFastFood` (`processing` existe bien : 47 cmd en base)
    - aucun test de commande sur `completed` / `done` / `in_progress` dans le front :
      les `"active"` restants sont des clés d'onglet UI ou l'état AppState, et
      `completed` / `processing` de `WithdrawSheet` sont des états de retrait
    - le classement livreur (`finished` / `delivering` / `delivered`) est correct
