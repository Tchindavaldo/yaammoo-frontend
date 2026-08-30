# Panier : ne retirer visuellement les cmd qu'APRÈS le dernier message de la capsule

[ ] panier : ne retirer visuellement les cmd qu'APRÈS le dernier message de la capsule
    - concerne les DEUX chemins : "Tout commander" (panier global) et le buy
      individuel d'une cmd depuis le panier (CartCheckoutSheet)
    - aujourd'hui dès que le paiement aboutit, le socket (userOrderUpdated /
      newFastFoodOrders) sort les cmd de `pendingToBuy` immédiatement : la liste
      se vide sous les yeux du user pendant que la capsule affiche encore
      "Paiement réussi..." puis "Commande créée avec succès"
    - la capsule elle-même ne disparaît plus (sa condition ne dépend plus de
      `pendingToBuy.length`), mais les cartes du panier, elles, s'évaporent trop tôt
    - attendu : garder l'affichage des cmd concernées jusqu'à la fin de l'état
      `success_created`, puis les retirer d'un coup au reset
    - piste : geler la liste rendue pendant `paymentState !== "total"` (snapshot
      local des cmd au lancement du paiement) et ne la relâcher qu'au resetPayment
