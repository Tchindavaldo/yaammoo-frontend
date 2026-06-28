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
│   ├── CheckoutPaymentOverlay.tsx      # Overlay paiement BAS (capsule) — saisie n° + étapes
│   ├── CheckoutPaymentTopOverlay.tsx   # Overlay paiement HAUT — récap commande + choix réseau
│   ├── AnimatedBorderGlow.tsx          # Bordure lumineuse animée (SVG) pendant l'attente paiement
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
  └── expressCardsCol (flex: 1, flexDirection: row, gap: 8)
        └── [ Location | Contact | VoiceNote ] (3 cartes flex:1, même ligne)

> Pas de card "Commande livrée dès que terminée" : le texte est porté par le
> sous-texte du bouton de sélection Express ("Livré dès que terminée").
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

**Répartition verticale** : le conteneur (`deliveryContainer`) a une hauteur fixe de
`230px` + `justifyContent: space-between`. Deux zones `flex: 1` se partagent cet espace :
- `topZone` (cartes infos — Express/Standard/Aucune), `justifyContent: flex-start`, `overflow: hidden`
- `bottomZone` ("Select Type" + grille Express/Heure/Aucun), `justifyContent: center`

Hauteur fixe = les zones ne bougent pas au changement de type de livraison.

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

## Paiement — UI à deux overlays

Au clic sur **Buy**, deux overlays s'affichent simultanément par-dessus le sheet
(montés en permanence, pilotés par `visible={isPaymentPopupVisible}`) :

### CheckoutPaymentTopOverlay (HAUT)
**Chemin** : `components/CheckoutPaymentTopOverlay.tsx`

- Occupe l'espace du sheet **au-dessus** de la capsule du bas (gap de 12px).
- Fond clair (BlurView `tint="light"`, `rgba(255,255,255,0.85)`).
- Contenu (markup **dupliqué** depuis le checkout, PAS de réutilisation des
  composants checkout pour ne rien casser) :
  - `MenuHeader` — photo + titre + description du menu.
  - `PriceRecap` — Menu / Boisson / Extras / Livraison (SANS le total).
  - **Total** affiché à part, plus grand (orange `#ec4913`).
  - `ActionArea` — **choix du réseau** (Orange Money / MTN MoMo) via `onNetworkChange`.
- Animation entrée (spring fade/slide/scale) + sortie (timing 220ms) synchro avec le bas.

### CheckoutPaymentOverlay (BAS — capsule)
**Chemin** : `components/CheckoutPaymentOverlay.tsx`

- Capsule pilule ancrée en bas, fond clair (`rgba(255,255,255,0.55)`).
- **N'a plus l'étape `network_select`** (gérée par le top overlay) → ouvre direct sur `input`.
- Étapes (`localPaymentState`) :
  - `input` — saisie du numéro (placeholder « saisir le numéro de paiement »).
    Validation locale : numéro vide → toast d'erreur, rien ne se lance.
  - `waiting` — après clic Payer (numéro OK) : input/cancel/payer masqués (fondu),
    affiche « Veuillez patienter... ». Piloté par `paymentState` du hook (pas en
    local) pour que le retour à `input` sur erreur fonctionne toujours.
  - `ussd_sent` — affiche **uniquement** `ussdMessage` du backend (pas de spinner).
  - `success` — « Paiement réussi ! Création de la commande en cours... » (1 ligne, 5s).
  - `success_created` — ✓ « Commande créée avec succès ! » (1 ligne, 5s) → fermeture.
  - (échec) — **aucun état `failed` affiché** dans l'overlay : on revient direct à
    `input`, l'erreur est montrée uniquement par le toast top.
- **AnimatedBorderGlow** : bordure lumineuse multicolore active sur tout état ≠ `input`.

### Synchro & fermeture
- Entrée/sortie des deux overlays synchronisées via `visible` (timing 220ms).
- Après `success_created` (5s), le parent ferme overlays **et** checkout
  (`setIsPaymentPopupVisible(false)` + `onClose()`). Le hook `useCheckout` ne
  repasse plus à `input` (évite la race condition).
- **En cas d'erreur, on ne ferme JAMAIS** et **aucun état `failed` n'est affiché** :
  seul `success_created` ferme. Toute erreur (métier, validation, verdict d'échec)
  revient à `input`, overlays ouverts, seul le toast top affiche l'erreur.
- `resetCheckout()` remet `paymentState` à `network_select`.

### Ouverture du sheet
- Modal en `animationType="fade"` (voile noir en fondu) + sheet en spring slide-up
  interne (`Animated.Value`), au lieu du `slide` natif qui faisait monter le voile.
- Toast `paymentError` rendu **dans** le Modal (1er plan, au-dessus du voile).

---

## Flux de statuts côté checkout

```
pendingToBuy  ←  Add to Cart (POST /order)
    ↓
  pending     ←  Buy (PUT /order/tabs/:userId) — décrémente stock
```
