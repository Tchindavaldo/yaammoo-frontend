# Champs obligatoires (menuFields et orderFields)

[x] (vérifié le 14/11/2026) Vérifier les champs obligatoires (required) dans
    menuFields et orderFields (backend `src/interface/`).
    - commande : `userId`, `fastFoodId`, `menu`, `total`, `quantity`, `userData`
      (prénom, nom, email non vides), `extra`, `drink`, `delivery.status`,
      `delivery.date` : tous envoyés par `useCheckout` et `sanitizeOrder`
    - `menu.coverImage` / `coverImageHasBackground` / `images` / `prices` requis
      dans la commande : le front les remplit (image du menu, `true` par défaut)
    - `userData.lastName` refusé s'il est vide : couvert par `ProfileNameSheet`,
      imposé avant toute commande (`requireName`)
    - contact exigé en retrait, lieu exigé en livraison : contrôlés aussi côté
      front avant l'envoi
    - aucun écart trouvé
