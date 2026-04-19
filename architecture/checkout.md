# Feature — Checkout (Bottom Sheets de commande)

## Rôle
Deux bottom sheets permettant de configurer et soumettre une commande :
- **CheckoutSheet** : depuis la home (menu sélectionné, statut `pending` directement)
- **CartCheckoutSheet** : depuis le panier (modification d'une commande `pendingToBuy`)

---

## Arborescence des fichiers

```
yaammoo/src/features/checkout/
├── hooks/
│   └── useCheckout.ts                  # Hook partagé — état commande, calculs, helpers
├── components/
│   ├── CheckoutSheet.tsx               # Bottom sheet home (commande directe)
│   ├── CheckoutSheet.styles.ts         # Styles de CheckoutSheet
│   ├── CartCheckoutSheet.tsx           # Bottom sheet panier (édition commande existante)
│   ├── CartCheckoutSheet.styles.ts     # Styles de CartCheckoutSheet
│   ├── CheckoutFooter.tsx              # Footer home : Add to Cart + Buy
│   ├── CartCheckoutFooter.tsx          # Footer panier : Save + Buy individuel
│   ├── CheckoutLocationOverlay.tsx     # Overlay saisie adresse livraison
│   ├── CheckoutContactOverlay.tsx      # Overlay saisie numéro de contact
│   ├── CheckoutPeriodOverlay.tsx       # Overlay sélection créneau horaire
│   ├── CheckoutVoiceNoteOverlay.tsx    # Overlay enregistrement note vocale
│   ├── CheckoutPaymentOverlay.tsx      # Overlay confirmation paiement
│   ├── shared/
│   │   ├── TabChip.tsx                 # Chip onglet (Detail / Extras / Boisson / Livraison)
│   │   ├── PriceChip.tsx               # Chip sélection taille/prix
│   │   └── ImageSlider.tsx             # Slider d'images du menu
│   └── tabs/
│       ├── DetailTab.tsx               # Onglet détail menu (image, prix, quantité)
│       ├── ExtrasTab.tsx               # Onglet extras/emballages
│       ├── DrinksTab.tsx               # Onglet boissons
│       └── DeliveryTab.tsx             # Onglet livraison (type + cartes infos)
```

---

## useCheckout.ts

**Chemin** : `yaammoo/src/features/checkout/hooks/useCheckout.ts`

**Signature** : `useCheckout(menu: Menu | null, initialOrder?: any, onChange?: (order) => void)`

**État géré** :
| State | Type | Rôle |
|---|---|---|
| `quantity` | number | Quantité commandée |
| `selectedPriceIndex` | number | Index du prix sélectionné (taille) |
| `selectedPackaging` | Embalage[] | Extras sélectionnés |
| `selectedDrinks` | Boisson[] | Boissons sélectionnées |
| `drinkQuantities` | Record<string, number> | Quantités par boisson |
| `delivery` | Livraison | Objet livraison complet |
| `isInitialized` | boolean | Init terminée (évite reset lors de rerenders) |

**Helpers exportés** :
- `validateDelivery()` → `string | null` — vérifie que les champs requis selon `delivery.type` sont remplis
- `validateStock()` → `string | null` — vérifie que `menu.stock >= quantity` (frontend guard avant API)
- `resetCheckout()` — réinitialise tout l'état
- `buildOrderPayload(fastFoodId, userId, status)` — construit le payload complet à envoyer au backend
- `total` (computed) — prix total avec extras et boissons

**Règles métier** :
- Si `menu.stock` n'est pas un `number` → pas de blocage stock
- Si `menu.stock < quantity` → message immédiat, pas d'appel API
- `delivery.type === 'aucune'` → `delivery.statut = false`, aucun champ requis
- `delivery.type === 'express'` → location + contact requis
- `delivery.type === 'standard'` → location + contact + heure requis

---

## DeliveryTab.tsx

**Chemin** : `yaammoo/src/features/checkout/components/tabs/DeliveryTab.tsx`

**Layout selon `delivery.type`** :

### Express
```
[ expressRow (flexDirection: row) ]
  ├── expressCardsCol (flex: 2)
  │     ├── Location (pleine largeur, marginBottom: 8)
  │     └── [ Contact | VoiceNote ] (flexDirection: row, gap: 8)
  └── expressInfoCol (flex: 1)
        └── flash icon + "Commande livrée dès que terminée"
```

### Standard
```
[ infoGrid4 ]
  ├── Location
  ├── Period (créneau horaire)
  ├── Contact
  └── VoiceNote
```

### Aucune
```
[ aucuneBanner ]
  └── storefront icon + "Vous passerez en boutique récupérer votre commande"
```

**Cartes colorées** (orange `#ec4913`) quand remplies.

---

## CheckoutSheet.tsx (home)

**Chemin** : `yaammoo/src/features/checkout/components/CheckoutSheet.tsx`

**Flux** :
1. User sélectionne un menu → modal visible
2. Navigue entre tabs (Detail / Extras / Boisson / Livraison)
3. Clique "Add to Cart" → `POST /order` avec `status: pendingToBuy`
4. Clique "Buy" → `validateStock()` → `validateDelivery()` → `POST /order` avec `status: pending`

**Note** : Les heures de livraison disponibles sont chargées depuis le menu via `GET /menu/:id` (enrichissement de `menuWithDeliveryHours`).

---

## CartCheckoutSheet.tsx (panier)

**Chemin** : `yaammoo/src/features/checkout/components/CartCheckoutSheet.tsx`

**Flux** :
1. User clique une commande du panier → modal visible avec `initialOrder` pré-rempli
2. `key={orderToEdit.id}` sur le composant → fresh state à chaque commande différente
3. Clique "Save" → `PUT /order` avec les modifications
4. Clique "Buy individuel" → `validateStock()` → `validateDelivery()` → `PUT /order/tabs/:userId` avec `[order]` (tableau d'un seul élément)

**Différence avec CheckoutSheet** : pas de "Add to Cart" (commande déjà dans le panier). Le statut passe de `pendingToBuy` → `pending` via la transition backend.

---

## Flux de statuts côté checkout

```
pendingToBuy  ←  Add to Cart (POST /order)
    ↓
  pending     ←  Buy (PUT /order/tabs/:userId) — décrémente stock
```
