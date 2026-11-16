# Panier : ne retirer visuellement les cmd qu'APRÈS le dernier message de la capsule

[x] (fait le 14/11/2026 : `cart.tsx` gèle la liste `pendingToBuy` tant que
    `paymentState !== "total"`, puis la relâche d'un coup au retour au repos ;
    vaut pour « Tout commander », le parcours groupé et le paiement par zone)
    panier : ne retirer visuellement les cmd qu'APRÈS le dernier message de la capsule
    - avant : dès le succès, le socket sortait les cmd de `pendingToBuy` et la
      liste se vidait pendant que la capsule affichait encore « Paiement réussi »
    - NOTE : le buy individuel (CartCheckoutSheet) a son propre état de paiement
      (useCheckout), non couvert par ce gel : à vérifier si le cas se présente
