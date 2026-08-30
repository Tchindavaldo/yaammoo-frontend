# Gestion des annulations de commandes

[ ] gerer les anulation de cmd
    - penaliser le marchand (couper un montant) sur sa prochaine cmd si il n'annule
      pas la cmd en moins de 10min en cas de penurie de stock ou indisponibilite,
      pour qu'on le transfere ailleurs ou notifie le client, ou le penaliser auto
      tout court car il n'a pas active les stocks
    - annulation pour stock insuffisant peut etre auto transferee a un autre
      marchand et notifier le user
    - annulation peut etre portee dont la raison est transferee a un autre ou a
      moi-meme l'admin de l'app : je gere manuellement sur le terrain si aucun
      fastfood n'a de stock ou de menu dispo
    - les annulations permettent de gerer les marchands qui n'ont pas de stock et
      qui ne mettent pas a jour le statut (dispo/indispo des menus)
