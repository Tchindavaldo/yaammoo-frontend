# Perfs des listes de commandes avec gros volume

[ ] tester les perfs des listes de commandes avec un gros volume
    - pages concernées : liste cmd côté user ET côté fastfood (marchand)
    - jeu de test : 100 puis 200 cmd sur UN SEUL statut, pour voir si ça rame
    - vérifier le scroll, le filtrage par date/période et le groupage
    - si ça rame : passer les ScrollView en FlatList virtualisée
      (`OrderManagePanel` rend actuellement toutes les cartes d'un coup)
