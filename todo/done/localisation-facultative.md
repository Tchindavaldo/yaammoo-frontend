# Localisation facultative au passage de la commande

[ ] PARTIEL (vérifié le 13/11/2026) : `validateDelivery()` accepte déjà adresse OU note texte
    (`useCheckout.ts`), mais pas la note VOCALE comme alternative.
    rendre la localisation facultative au passage de la commande
    - aujourd'hui l'envoi de la localisation est obligatoire → la desactiver
    - si le user n'envoie PAS sa localisation, la note vocale devient obligatoire
      (elle sert alors à décrire le lieu de livraison au livreur)
    - donc au moins l'un des deux est requis : localisation OU note vocale
    - adapter `validateDelivery()` (checkout) + les deux points d'entrée
      (CheckoutSheet et CartCheckoutSheet)
