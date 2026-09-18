# Retirer l'option « sans livraison » de l'onglet delivery

[ ] ⚠️ IMPORTANT — À GÉRER AVANT LE DÉPLOIEMENT FINAL EN PROD
    retirer l'option "sans livraison" de l'onglet delivery
    - aujourd'hui le user peut choisir "à emporter" alors que le prix affiché inclut déjà la livraison
      (fondue dans le prix du plat depuis le home) → il paie une course qu'il ne reçoit pas
    - le backend trace déjà ce cas : order_deliveries.delivered = false → marge pure (cf. backend architecture/pricing.md)
    - à remplacer plus tard par :
        - VIP delivery (option premium)
        - ou réservation d'une place au fastfood pour consommer sur place
    - à croiser avec la tâche "gestion livraison surplace" plus haut
