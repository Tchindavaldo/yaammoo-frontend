# Lazy loading : ne charger au boot que ce qui est affiché

[ ] Au démarrage de l'app, ne charger QUE les données réellement affichées à l'écran,
    pas celles des interfaces non visibles. Charger le reste à la demande.

[ ] **Au lancement** : faire le `GET` UNIQUEMENT des **fastfoods du Home**.
      Ne PAS déclencher les `GET` des autres interfaces au boot.
[ ] **Autres interfaces** (onglets/écrans non affichés à l'ouverture) : ne faire
      leur `GET` que **lorsqu'on y accède** (à l'entrée dans l'écran), pas avant.
[ ] **Pendant le chargement** d'une interface : afficher un **loader** ou un
      **placeholder / fake data (skeleton)** en attendant les vraies données.
[ ] Vérifier qu'aucun contexte global (Order/Socket/...) ne pré-charge tout au boot.
[ ] Prévoir un composant skeleton/placeholder réutilisable.
