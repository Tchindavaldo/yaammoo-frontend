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
│   ├── CheckoutPeriodOverlay.tsx       # Overlay sélection créneau horaire (Heure/standard)
│   ├── CheckoutExpressOverlay.tsx      # Overlay sélection zone express (lieu + prix)
│   ├── CheckoutVoiceNoteOverlay.tsx    # Overlay enregistrement note vocale
│   ├── CheckoutPaymentOverlay.tsx      # Overlay paiement BAS (capsule) — saisie n° + étapes
│   ├── CheckoutPaymentTopOverlay.tsx   # Overlay paiement HAUT — récap commande + choix réseau
│   ├── AnimatedBorderGlow.tsx          # Bordure lumineuse animée (SVG) pendant l'attente paiement
│   ├── shared/
│   │   ├── TabChip.tsx                 # Chip onglet (Detail / Extras / Boisson / Livraison)
│   │   ├── PriceChip.tsx               # Chip sélection taille/prix
│   │   ├── ImageSlider.tsx             # Slider d'images du menu
│   │   └── DeliveryValidateRow.tsx     # Ligne bas des overlays Période/Express : code bonus + détails zone + VALIDER
│   └── tabs/
│       ├── DetailTab.tsx               # Onglet détail menu (image, prix, quantité)
│       ├── ExtrasTab.tsx               # Onglet extras/emballages
│       ├── DrinksTab.tsx               # Onglet boissons
│       └── DeliveryTab.tsx             # Onglet livraison (type + cartes infos)
├── services/
│   └── verifyBonusCode.ts              # POST /bonus/verify — vérif d'un code bonus (lecture seule)
└── utils/
    ├── cartDeliveryTotal.ts            # Total panier + mutualisation des frais de livraison
    └── periodDate.ts                   # extractPeriodDate() — date ISO extraite de "YYYY-MM-DD|HH:mm|lieu"
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
| `delivery` | Livraison | Objet livraison complet (dont `delivery.bonusCode: string \| null` — code bonus vérifié appliqué) |
| `isInitialized` | boolean | Init terminée (évite reset lors de rerenders) |

**Helpers exportés** :
- `validateDelivery()` → `string | null` — vérifie que les champs requis selon `delivery.type` sont remplis
- `validateStock()` → `string | null` — vérifie que `menu.stock >= quantity` (frontend guard avant API)
- `resetCheckout()` — réinitialise tout l'état
- `createOrder(status = "pendingToBuy")` — construit le payload complet à envoyer au backend (renvoie `null` si invalide)
- **Calculs (computed)** : `total`, `deliveryPrice`, `isDeliveryFree`, `displayDeliveryPrice`,
  `displayTotal` — `isDeliveryFree` vrai si `deliveryOffer.active` OU code bonus vérifié
  (`delivery.bonusCode`). `displayTotal` = `total` moins la livraison quand elle est
  offerte ; c'est lui qui part dans `order.total` et dans `amount`. Le **vrai** prix
  de livraison reste toujours envoyé dans `delivery.prix` (le livreur doit être payé).

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
        └── [ Location | Zone? | Contact | VoiceNote ] (cartes flex:1, même ligne)

> Pas de card "Commande livrée dès que terminée" : le texte est porté par le
> sous-texte du bouton de sélection Express ("Livré dès que terminée").

> Card **Zone** (lieu express) : affichée UNIQUEMENT si le backend a fourni des
> `expressZones` (nouveau format `deliveryHours`). Sinon masquée (rétrocompat).
> Ouvre `CheckoutExpressOverlay`. La card n'affiche AUCUNE donnée (titre "Zone"),
> seuls ses bords se surlignent en orange quand une zone est sélectionnée.
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

**Prix de livraison — Express et Période indépendants** :
- **Standard/Heure** → prix du créneau sélectionné, stocké dans `delivery.prix`
  (renseigné par `CheckoutPeriodOverlay`).
- **Express** → prix de la zone sélectionnée, stocké dans `delivery.expressPrix`
  + lieu dans `delivery.expressLieu` (renseignés par `CheckoutExpressOverlay`).
- Les deux prix sont **strictement séparés** : choisir un créneau Heure n'affecte
  plus le prix affiché sur Express (et inversement).
- `useCheckout` calcule `deliveryPrice` selon le **type actif** : `expressPrix`
  si express, `prix` si standard. **Aucun prix par défaut** : tant qu'aucune
  zone/période n'est choisie, `deliveryPrice = 0`. Le prix vient EXCLUSIVEMENT
  de la sélection (ce sont les lieux/zones qui définissent le prix de livraison).
- `validateDelivery` bloque le paiement tant que la zone express n'est pas
  choisie (si des `expressZones` existent) ou que la période n'est pas choisie.

**Affichage « Offert » sur la grille Select Type (gratuité)** : `DeliveryTab` reçoit
`deliveryOffer` (passé par `CheckoutSheet`/`CartCheckoutSheet`). Les **titres** ne
portent jamais de montant (« Express », « Heure », « Aucun ») : tout ce qui est prix
vit dans le sous-texte, au style `deliveryTypeSubText`.

La mise en page à deux lignes ne s'applique QUE si l'offre est active **et** qu'une
zone / un créneau avec prix est sélectionné :

| Cas | Express | Heure |
|---|---|---|
| Offre active + sélection | « Dès que terminée » puis « **Offert** · ~~500F~~ » | « {date} {heure} » sur une ligne, puis « **Offert** · ~~{prix}F~~ » |
| Sinon | « Livré dès que terminée · 500F » | « {date} » / « {heure} · {prix}F » (2 lignes) |

« Offert » est en vert semi-gras (`localStyles.freeLabel`), le prix réel barré en
gris (`localStyles.strikePrice`).

**Fond des cartes du `topZone`** : gris `#f1f5f9` avec bordure `#cbd5e1`, remplacés
par le fond orange clair quand la carte est remplie. Le bandeau « retrait boutique »
(type Aucune) reprend la même hauteur (80) et le même arrondi que ces cartes.

> `GroupedDeliveryTab` (sheet de livraison groupée) applique **exactement** les
> mêmes règles — c'est une copie dédiée, cf. R16.

**Formats `deliveryHours`** : le backend sert ce champ en ancien (`string[]`) ou
nouveau format (`{ hour, periodic, periodicZones, express, expressZones }`) selon
la version du client (voir [http-versioning.md](./http-versioning.md)). Sans
`expressZones`, la card Zone est masquée (aucun prix par défaut n'est appliqué).

**Format des données de zone** (nouveau format) :
```json
{
  "hour": "08:00",
  "periodic": true,
  "periodicZones": [{ "lieu": "Bonanjo", "prix": "500" }],
  "express": true,
  "expressZones": [{ "lieu": "Bonanjo", "prix": "1000" }]
}
```

**Payload `delivery` envoyé au backend** (`POST /order`, `PUT /order/tabs/:userId`) —
construit dans `useCheckout.createOrder()` :
```js
delivery: {
  status: true,
  date: "2026-07-13",
  type: "time" | "express",   // "time" = standard/Heure
  prix: 700,                  // prix de livraison UNIQUE (le type distingue les cas)
  location, phone, note, voiceNoteUri,
  time: "17:25",              // si type === "time" (heure seule, extraite de delivery.hour)
  zone: "Banganté",           // lieu/zone sélectionné — envoyé pour "time" ET "express"
}
```
- `prix` et `zone` sont **nouveaux** (optionnels côté backend → rétrocompat descendante).

> ⚠️ **`delivery.date` — date de livraison choisie.** `CheckoutPeriodOverlay` remonte la
> période au format `"YYYY-MM-DD|HH:mm|lieu"` : la date choisie n'existe QUE dans cette
> chaîne. `CheckoutSheet` et `CartCheckoutSheet` l'extraient avec `extractPeriodDate()`
> (`utils/periodDate.ts`) et la posent dans `delivery.date` au `setDelivery`.
> Sans ça, `useCheckout` retombe sur son fallback `new Date()` et **toute commande
> programmée pour un jour à venir part avec la date du jour** — elle apparaît alors dans
> « aujourd'hui » côté marchand (cf. `architecture/orders-merchant.md`).
- `expressPrix`/`expressLieu` ne sont PAS envoyés : le backend n'a besoin que de
  `type` + `prix` + `zone`. Ces champs restent internes à l'état frontend (affichage).

---

## Bonus livraison & offre gratuite (`deliveryOffer`)

Le backend greffe un objet **`deliveryOffer`** sur chaque fastfood
(`GET /fastfood/all` et `GET /fastfood/:id`). Il décrit si la livraison est
**offerte** et par qui. Type `DeliveryOffer` (dans `src/types/index.ts`) :

```ts
{
  active: boolean;
  reason: "campaign" | "bonus";        // campagne plateforme OU bonus armé du user
  coveredBy: "platform" | "fastfood";
  bonusId: string | null;
  bonusCode: string | null;            // code que le user peut aussi saisir manuellement
  bonusName: string | null;            // ex. "Livraison offerte"
  fastFoodId: string | null;
}
```
`deliveryOffer: null` = aucune offre → livraison payante.

**Câblage** : `CheckoutSheet`/`CartCheckoutSheet` greffent `deliveryOffer` sur
`menuWithDeliveryHours` (déjà récupéré par `GET /fastfood/:id`), puis le passent
aux overlays Période/Express.

**Ligne de validation (`DeliveryValidateRow`)** — bas des deux overlays, **une
seule ligne** : tout le texte à **gauche**, le(s) bouton(s) à **droite**.
- Offre `active` → gauche affiche direct « Livraison offerte · <émetteur>
  (Promo yaammoo / nom du bonus) », un seul bouton VALIDER.
- Pas d'offre, aucune zone choisie → **input code bonus** à gauche + bouton VALIDER.
  Un bouton pastille (à droite) ouvre/ferme l'input.
- Zone choisie → **détails** (lieu + prix, ou « offerte » si le code a été
  vérifié) à gauche + 2 boutons (code / VALIDER) à droite.

**Vérification du code — `POST /bonus/verify`** (`services/verifyBonusCode.ts`).
Le code saisi n'est **jamais** validé localement : au clic sur VALIDER, si un
code est présent, l'overlay appelle l'endpoint (lecture seule, ne consomme rien)
avec `{ code, fastFoodId }`.
- `{ valid: true, … }` → le code est retenu, l'overlay **se ferme**, la livraison
  passe en « Offert ».
- `{ valid: false, reason }` → **toast d'erreur**, l'overlay **reste ouvert**
  pour ressaisie (`code_not_found`, expiré, épuisé, mauvaise boutique…).

Pendant l'appel, le bouton VALIDER affiche un `ActivityIndicator` et est
désactivé (`verifying`). Règles associées :
- Modifier le code après vérification **annule** celle-ci (`verifiedCode → null`).
- Un code saisi **sans zone/période sélectionnée** est refusé (toast) : sans
  livraison choisie, il n'y a rien à offrir.
- Un code déjà vérifié et inchangé ne redéclenche pas d'appel réseau.
- `deliveryOffer.active` (offre automatique du `GET /fastfood/all`) est
  **indépendant** : il rend la livraison offerte sans aucune saisie ni appel.

**Liste des zones (overlays Période/Express) en cas de gratuité** : chaque ligne de
zone affiche le **prix normal barré** au-dessus de **« Offert »** (orange), via le
conteneur `pricePair` + styles `strikePrix` / `freePrix`. La valeur normale reste
visible même quand la livraison est offerte.

**Payload order** : quand le user a saisi un code **vérifié valide**, `useCheckout`
ajoute à la **racine** du payload une clé plate :
```js
bonusCode: "ABC123"     // uniquement sur saisie du user, jamais déduit d'une offre auto
```
Une offre `deliveryOffer.active` sans saisie n'envoie **rien** : c'est au backend
de la redériver.

Le **prix de livraison sélectionné est TOUJOURS envoyé** dans `delivery.prix`,
gratuité ou non. Seul `order.total` (= `displayTotal`) l'exclut quand un bonus
s'applique.

**Non-restauration du code** : `bonusCode` n'est **jamais** rechargé depuis une
commande existante (`initialOrder`). Un code est à usage unique et déjà consommé ;
le restaurer offrirait la livraison indéfiniment à chaque réédition. Pour en
rebénéficier, le user resaisit un code → nouvelle vérification.

---

## CheckoutSheet.tsx (home)

**Chemin** : `yaammoo/src/features/checkout/components/CheckoutSheet.tsx`

**Flux** :
1. User sélectionne un menu → modal visible
2. Navigue entre tabs (Detail / Extras / Boisson / Livraison)
3. Clique "Add to Cart" → `POST /order` avec `status: pendingToBuy`
4. Clique "Buy" → `validateStock()` → `validateDelivery()` → `POST /order` avec `status: pending`

**Note** : Les heures de livraison (`deliveryHours`, `orderLeadTime`, `advanceDays`,
`deliveryOffer`) sont déjà attachées au menu par `DesignRouter` depuis `GET /fastfood/all`.
`CheckoutSheet` recopie simplement `menu` dans `menuWithDeliveryHours` (**aucun refetch**
`GET /fastfood/:id` / `GET /menu/:id`).

---

## CartCheckoutSheet.tsx (panier)

**Chemin** : `yaammoo/src/features/checkout/components/CartCheckoutSheet.tsx`

**Flux** :
1. User clique une commande du panier → modal visible avec `initialOrder` pré-rempli
2. `key={orderToEdit.id}` sur le composant → fresh state à chaque commande différente
3. Clique "save" → `onSave` → `PUT /order` (voir ci-dessous)
4. Clique "Valider" → `validateStock()` → `validateDelivery()` → paiement

**Différence avec CheckoutSheet** : pas de "Add to Cart" (commande déjà dans le panier). Le statut passe de `pendingToBuy` → `pending` via la transition backend.

**Bouton "save" (`onSave`)** — enregistre les modifications locales **sans acheter** :
- Appelle `saveOrder` du `OrderContext` (`PUT /order`, `status` retiré du payload) —
  surtout **pas** `buyOrders`, qui passe par `/order/tabs` et déclencherait la
  transition `pendingToBuy → pending` (cf. [orders-client.md](orders-client.md)).
- Le sheet **reste ouvert** (toast « Modifications enregistrées ») pour permettre
  de continuer à éditer ; seul "Valider" ferme.
- Sans la prop `onSave`, le bouton n'est pas rendu.

**Footer (`CartCheckoutFooter`)** : mêmes styles que le footer du home
(`bottomActionBar` gap 4, prix `flex: 1` sur 2 lignes, `buyBtn` `flex: 1.2`) ; le
bouton `save` reprend le gabarit du "add To Cart" (`flex: 1.5`, radius 24).

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

### Ouverture / fermeture du sheet
- Modal en `animationType="fade"` (voile noir en fondu) + sheet en slide-up
  interne (`Animated.Value`), au lieu du `slide` natif qui faisait monter le voile.
- ⚠️ **`EXIT_DISTANCE` = hauteur d'écran, PAS `SHEET_HEIGHT`.** `SHEET_HEIGHT`
  (384) ne sert qu'à la hauteur du conteneur ; la hauteur **réelle** du sheet la
  dépasse (safe area `insets.bottom` + contenu débordant). Translater de
  `SHEET_HEIGHT` laissait le bas du sheet à l'écran, figé, jusqu'au démontage —
  la fermeture paraissait **caler** juste avant la fin. Vaut pour `CheckoutSheet`
  et `CartCheckoutSheet`.
- Entrée et sortie en `timing` borné (280ms / 240ms) : depuis un écran entier, un
  `spring` mettrait visiblement plus longtemps à monter.
- Toast `paymentError` rendu **dans** le Modal (1er plan, au-dessus du voile).

---

## Flux de statuts côté checkout

```
pendingToBuy  ←  Add to Cart (POST /order)
    ↓
  pending     ←  Buy (PUT /order/tabs/:userId) — décrémente stock
```

---

## Mutualisation des frais de livraison (panier)

**Chemin** : `yaammoo/src/features/checkout/utils/cartDeliveryTotal.ts`

Le user ne doit pas payer plusieurs fois la même course : deux commandes livrées
au même endroit (et au même moment en mode période) = **un seul déplacement**.

**Clé de groupe** (`deliveryGroupKey`) :
- `express` → `fastFoodId + zone`
- `time`    → `fastFoodId + zone + date + heure`
- commande en retrait (`delivery.status !== true`) ou prix nul → aucune course

**`computeCartTotal(orders)`** = Σ des `order.total` **+** une seule livraison par
groupe encore due. Une commande portant un `bonusCode` est **exclue du
groupement** : elle ne paie rien et ne « consomme » pas la course du groupe —
une autre commande de la même zone/créneau paie donc sa livraison normalement.

Utilisé par `app/(tabs)/cart.tsx` (`cartTotal`), qui alimente `useCartPayment`
→ `amount` de `POST /transaction`.

⚠️ `delivery.prix` est envoyé sur **chaque** commande (le livreur doit être payé) ;
seule son inclusion dans les totaux/`amount` varie.

**Vérifié bout-en-bout** contre `POST /transaction` (vrais menus de
`GET /fastfood/all`) : 2 ou 3 commandes identiques → 1 seule livraison facturée ;
zones différentes, fastfoods différents → aucune déduction. Le backend **refuse**
par ailleurs qu'une même boutique porte deux livraisons différentes (type, zone
ou heure divergents) — ces paniers ne peuvent pas exister.

---

## Sanitization avant paiement (`sanitizeOrder`)

**Chemin** : `yaammoo/src/features/orders/utils/sanitizeOrder.ts`

Recopie une liste **fermée** de champs avant l'envoi dans `items` de
`POST /transaction`. Doivent impérativement y figurer, sous peine que le backend
ne puisse ni vérifier le montant ni mutualiser :
- `delivery.prix` et `delivery.zone`
- `bonusCode` (racine) — justifie un total sans frais de port
- `rawPrice` sur `menu.prices[]`, `extra[]` et `drink[]` (voir ci-dessous)

⚠️ **Liste fermée = aucun champ n'est transmis automatiquement.** Un nouveau
champ servi par `GET /fastfood/all` est silencieusement supprimé s'il n'est pas
ajouté explicitement ici **et** dans `useCheckout.createOrder()`.

---

## `rawPrice` — prix brut hors marge

Le backend sert un **prix brut** sur chaque prix de menu, extra et boisson
(`GET /fastfood/all`). Le front le nomme `rawPrice` de bout en bout.

**Chaîne complète** (3 points à toucher pour tout champ de ce genre) :
1. `normalizeMenu()` (`src/features/restaurants/context/FastFoodContext.tsx`) —
   aplatit `prices[].rawPrice` en `rawPrice1/2/3` (comme `prix1/2/3`). Les
   `extra[]`/`drink[]` passent tels quels via le spread `...m`.
2. `useCheckout.createOrder()` — reporte `rawPrice` dans `menu.prices[]` (depuis
   `rawPrice1/2/3`) et dans les `extra[]`/`drink[]` de la racine (portés par les
   classes `Embalage`/`Boisson`, qui ont un 3e champ `rawPrice`).
3. `sanitizeOrder()` — conserve `rawPrice` sur `menu.prices[]`, `extra[]`, `drink[]`.

Le champ est **omis** (pas mis à `0`/`null`) quand le backend ne le fournit pas.

**`menu.extra` / `menu.drink` ne sont plus envoyés** : le backend les a rendus
optionnels et détient déjà le menu. Seuls les `extra[]`/`drink[]` de la **racine**
partent — ce sont eux qui portent la sélection du client (`status: true/false`).
