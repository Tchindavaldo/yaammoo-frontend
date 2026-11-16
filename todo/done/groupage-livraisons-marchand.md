# Groupage des livraisons configurable par le marchand

[ ] permettre au marchand de configurer le groupage des livraisons d'un même user
    - option marchand : offrir la gratuité de la livraison si le user a déjà des cmd
      NON encore livrées vers la même zone, même date/heure et même type de livraison
    - le marchand choisit les états de cmd concernés (en attente, en cours, en préparation…)
      → multi-sélection possible, plusieurs états à la fois
    - objectif : regrouper ces cmd pour les traiter et les livrer en UNE seule course
    - côté user, au passage de la cmd : lui afficher les états des cmd déjà passées
      éligibles au groupage, et lui demander s'il veut qu'on groupe avec les autres
      ou qu'on livre d'abord les autres
    - à croiser avec la tâche `groupId` (commandes groupées d'un panier) plus haut
      et avec la facturation d'UNE seule course — cf. backend architecture/pricing.md
