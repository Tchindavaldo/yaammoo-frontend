# Commandes groupées d'un panier (groupId) (IMPLÉMENTÉ)

[x] IMPLÉMENTÉ (vérifié dans le code le 13/11/2026) — par une clé de groupe, pas par le champ `groupId` :
    - marchand : `OrderManagePanel` regroupe par `orderGroupKey` (client + date + créneau/zone,
      `merchant/utils/orderGroupKey.ts`) → une ligne par groupe, « N cmd » ; onglet Montant
      par `deliveryGroupId`, course facturée une seule fois (`courseBilled`), libellé « Cmd groupée »
    - client : `CartStatusPanel.parts.tsx` (`groupBySlot`, même `orderGroupKey`) + onglet Montant
      dans `OrderBottomSheet`
    ⚠️ IMPORTANT — À GÉRER AVANT LE DÉPLOIEMENT FINAL EN PROD
    afficher les commandes groupées d'un panier dans la liste du fastfood
    - les cmd passées depuis le panier partagent un champ `groupId` (renseigné par le backend au passage en `pending`)
    - côté marchand : regrouper visuellement les cmd d'un même `groupId` (un seul client, une seule livraison)
    - utile car une cmd = un plat : un panier de 3 plats arrive comme 3 cmd distinctes
    - le backend ne facture qu'UNE course par (panier, boutique) — cf. backend architecture/pricing.md
    - côté client aussi : voir ses cmd groupées par panier dans l'historique
