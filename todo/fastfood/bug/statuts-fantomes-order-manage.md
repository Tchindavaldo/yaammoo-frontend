# OrderManagePanel : statuts fantômes dans statusMap

[ ] `merchant/components/OrderManagePanel.tsx` — `statusMap` (l.133) contient des
      variantes jamais émises (`processing`, `active`, `in_progress`, `completed`,
      `done`). Ne garder que les valeurs réellement produites par le backend.
    - statuts EXACTS du projet : `pending`, `finished`, `delivering`, `delivered`
      (cycle : `finished` = à livrer → `delivering` = en cours → `delivered` = terminé)
    - fragile : un statut fantôme peut tomber dans la mauvaise catégorie
      (cf. bug livreur `finished` classé "En attente")
