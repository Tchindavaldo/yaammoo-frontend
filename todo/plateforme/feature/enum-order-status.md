# Centraliser les statuts de commande (enum OrderStatus)

[ ] Idéalement : centraliser les statuts dans un seul type/enum (`OrderStatus`)
      pour interdire les valeurs fantômes à la compilation.
    - statuts EXACTS du projet : `pending`, `finished`, `delivering`, `delivered`
