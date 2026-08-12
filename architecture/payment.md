# Feature — Payment Integration (MobileWallet)

## ✅ INTÉGRATION COMPLÈTE — Paiement Mobile Money (Orange Money / MTN)

Les paiements Mobile Money sont maintenant intégrés via le backend ai_browser2.

---

## Rôle

Permettre aux utilisateurs de payer les commandes via Mobile Money (Cameroun : Orange Money, MTN).

**Deux points d'entrée** :
1. **CheckoutSheet** (home) : paiement direct après "Buy"
2. **CartCheckoutSheet** (panier) : paiement d'une commande individuelle après "Buy individuel"

---

## Architecture du flux paiement

```
[User appuie BUY dans CheckoutSheet / CartCheckoutSheet]
        │
        ▼ affiche DEUX overlays : panel HAUT (récap + réseau) + capsule BAS (input)
        ┌────────────────────────────────────────────┐  ← TOP (fond clair)
        │ [photo] Titre menu · description           │
        │ Menu  Boisson  Extras  Livraison           │
        │ Total à payer                  <montant> F │
        │ Réseau :  [Orange Money] [MTN MoMo]        │
        └────────────────────────────────────────────┘
        ┌────────────────────────────────────────────┐  ← BAS (capsule, état INPUT)
        │ [close ✕]   [saisir le numéro]   [btn →]   │
        └────────────────────────────────────────────┘

USER choisit réseau (haut) + saisit numéro (bas) + appuie Payer →
        │  (numéro vide → toast, rien ne se lance)
        ▼  capsule BAS passe en WAITING (« Veuillez patienter... » + bordure animée)
[Frontend] POST /transaction  ────────────────────────► [Backend yaammoo]
  { payBy:'mobilemoney', amount, phone, network,                 │
    email, userId, items:[...] }         POST /pay → ai_browser2
  (items = commande(s) complète(s) ; le backend en déduit le fastFoodId)
                                         (X-Admin-Key)        │
                                         réponse synchrone :  │
                                         { status:'ussd_sent'} │
                                         ◄────────────────────┘
[Frontend reçoit ussd_sent → capsule BAS état USSD_SENT]
        ┌────────────────────────────────────────────┐
        │ <message USSD backend — affiché tel quel>  │  (bordure animée, pas de spinner)
        └────────────────────────────────────────────┘

        [user compose le code USSD — quelques minutes]

[ai_browser2 poll DigiKUNTZ → verdict terminal]
        ├── Socket.IO → room app:<app_id>  event: "transaction.update"
        └── Webhook HTTP POST → callback_url (HMAC signé, retries 0/5/30s)

[Backend yaammoo : 1er reçu utilisé (idempotent)]
        ├── Émet socket vers frontend :
        │   io.to(`user:${userId}`).emit('payment.settled', {...})
        └── EN PARALLÈLE si successful : crée la commande

[Frontend reçoit 'payment.settled' via socketService (singleton)]
        ├── successful → SUCCESS « Paiement réussi ! Création... » (5 s)
        │             → SUCCESS_CREATED ✓ « Commande créée... » (5 s)
        │             → fermeture des 2 overlays + du checkout
        │
        └── failed / cancelled → toast haut + retour état INPUT
```

---

## Stack technique

- **Backend MobileWallet API** : `POST /pay` (admin key)
- **Frontend** : hook `useCheckout.ts` pour orchestrer le paiement
- **Socket.IO** : écoute `payment.settled` pour le verdict en temps réel
- **UI** : 2 overlays — `CheckoutPaymentTopOverlay.tsx` (récap + réseau) +
  `CheckoutPaymentOverlay.tsx` (capsule, états saisie/paiement) + `AnimatedBorderGlow.tsx`
- **State** : intégré dans `useCheckout` (home) / `useCartPayment` (panier) — pas de PaymentContext
- **Payload** : `items` = commande(s) au format `buyOrders → /order/tabs` ; le backend en déduit le `fastFoodId`.
  Depuis le **panier**, elles passent par `src/features/orders/utils/sanitizeOrder.ts` ; depuis le
  **checkout**, `useCheckout` envoie directement le retour de `createOrder()`. Les deux chemins
  construisent les champs un par un (liste fermée) : un champ servi par `GET /fastfood/all` n'est
  **jamais** transmis automatiquement — il doit être ajouté aux deux (cf. `rawPrice`,
  [checkout.md](./checkout.md))
- **Timeout HTTP** : `axios.defaults.timeout = 60000` (60 s) défini dans `src/api/config.ts`
  (défaut axios = 0 = infini) — couvre les paiements MobileWallet lents

---

## Fichiers impactés

### Frontend
- `src/features/checkout/hooks/useCheckout.ts` : state paiement + handlers + verdict
- `src/features/checkout/components/CheckoutPaymentOverlay.tsx` : capsule BAS, états input→success
- `src/features/checkout/components/CheckoutPaymentTopOverlay.tsx` : panel HAUT, récap + choix réseau
- `src/features/checkout/components/AnimatedBorderGlow.tsx` : bordure lumineuse animée (SVG)
- `src/features/checkout/components/CheckoutSheet.tsx` : branchement socket + paiement + anim ouverture
- `src/features/checkout/components/CartCheckoutSheet.tsx` : idem pour panier
- `src/features/payment/hooks/useCartPayment.ts` + `components/CartPaymentOverlay.tsx` : paiement global panier
- `src/features/orders/utils/sanitizeOrder.ts` : sanitization des `items`
- `src/services/socket.ts` : singleton `socketService`, listener `payment.settled` + register/unregister handler

### Backend yaammoo (`BACKEND/`)
- `src/services/transaction/mobilewalletService.js` : appel sortant ai_browser2
- `src/services/transaction/postTransaction.service.js` : dispatch vers mobile money
- `src/routes/transactionRoutes.js` : route webhook
- `src/controllers/transaction/webhookMobilewallet.controller.js` : vérification HMAC
- `src/services/transaction/webhookMobilewallet.service.js` : réception verdict, création commande

---

## useCheckout.ts

**Chemin** : `src/features/checkout/hooks/useCheckout.ts`

**État géré** :
```typescript
paymentNetwork: 'orange' | 'mtn';           // Réseau sélectionné (via top overlay)
paymentState: 'network_select' | 'input' | 'waiting' | 'ussd_sent'
            | 'success' | 'success_created' | 'failed';  // État overlay
paymentError: string | null;                 // Message erreur
ussdCode: string;                            // '#150#' ou '*126#' (calculé, plus affiché)
ussdMessage: string | null;                  // Message USSD renvoyé par le backend (cas A)
```

> Note : `network_select` reste l'état initial du hook ; la capsule du bas le mappe
> vers `input` (le réseau se choisit dans le top overlay). `ussdCode` est encore
> calculé mais n'est plus consommé par l'overlay (le message backend suffit).

**Handlers** :
- `handlePaymentConfirm()` : passe `paymentState` à `waiting` (source de vérité
  unique, pas un état local capsule — sinon le resync vers `input` sur erreur ne
  se redéclenche pas), puis `POST /transaction` avec `payBy:'mobilemoney'`. Traite 3 cas :
  - **Cas A** (`status: 'ussd_sent'` / `success: true`) → stocke `ussdMessage` (affiché tel quel), passe à `ussd_sent`
  - **Cas B** (erreur métier, ex. `retry_too_soon`) → `paymentError` (le délai est déjà dans le message backend), retour `input`
  - **Cas C** (validation échouée, `message` = tableau `[{ field, message }]`) → concatène les messages de champs, retour `input`
- `handlePaymentVerdict(data)` : reçoit `payment.settled`.
  - `successful` → `success` (5 s) → `success_created` (le parent ferme overlays + checkout ;
    le hook ne repasse **plus** à `input` → évite la race condition).
  - sinon (échec) → `paymentError` posé + retour **direct à `input`** (aucun état
    `failed` affiché dans l'overlay ; seul le toast top montre l'erreur).
- `registerPaymentHandler(fn)` / `unregisterPaymentHandler()` : gestion socket

---

## UI paiement — deux overlays

> Détail complet dans [checkout.md](./checkout.md) § « Paiement — UI à deux overlays ».

Le choix du réseau et le récap commande sont gérés par **CheckoutPaymentTopOverlay**
(panel HAUT, fond clair). La saisie du numéro et les étapes du paiement sont gérées
par **CheckoutPaymentOverlay** (capsule BAS).

### CheckoutPaymentOverlay.tsx (capsule BAS)
**Chemin** : `src/features/checkout/components/CheckoutPaymentOverlay.tsx`

**Props** : `visible`, `onRequestClose`, `onClose`, `phone`, `onPhoneChange`,
`paymentState`, `ussdMessage?`, `onError`, `onConfirm`.
(plus de `network`/`onNetworkChange`/`ussdCode`/`totalAmount` — réseau géré par le top overlay.)

**États** (`localPaymentState`) :
1. **input** : input numéro (placeholder « saisir le numéro de paiement ») + bouton payer.
   Validation locale : numéro vide → `onError` (toast), rien ne se lance.
2. **waiting** : input/cancel/payer masqués (fondu), « Veuillez patienter... ».
3. **ussd_sent** : `ussdMessage` du backend **uniquement** (pas de spinner, pas de montant).
4. **success** : « Paiement réussi ! Création de la commande en cours... » (1 ligne, 5 s).
5. **success_created** : ✓ « Commande créée avec succès ! » (1 ligne, 5 s) → fermeture auto.
- (échec) : **aucun état `failed` affiché** — retour direct à `input`, erreur via toast top.

> ⚠️ La capsule **n'a plus l'étape `network_select`** (mappée vers `input` à l'init).
> **AnimatedBorderGlow** : bordure lumineuse animée active sur tout état ≠ `input`
> (remplace les spinners pendant l'attente).

---

## Paiement global du panier (page cart)

Le paiement de **toutes les commandes du panier** (page `app/(tabs)/cart.tsx`) a sa
propre logique, **isolée de useCheckout** (données propres, aucun partage).

- **Hook** : `src/features/payment/hooks/useCartPayment.ts` — états
  `total → network_select → input → waiting → ussd_sent → success → success_created`.
  `handlePaymentConfirm(phone, items, amountOverride?)` (POST /transaction avec
  `items`), `handlePaymentVerdict` (socket). En cas d'échec : retour direct au
  `total` (pas d'état `failed` affiché), erreur via toast top.
- **Paiement d'une seule zone** : le bouton « commander » du récap du bas
  (`CartZoneFooterBar`) ne paie que les commandes du groupe affiché quand une
  seule zone est visible. `cart.tsx` garde `payingGroupKey` (null = panier
  entier) et en dérive `ordersToPay` / `amountToPay` ; `amountToPay` est passé en
  **`amountOverride`** — sans lui, le montant envoyé resterait le total du panier
  (`amount` fixé à la création du hook).
- **UI — un bottom sheet + la capsule** : `components/CartPaymentSheet.tsx`.
  Il reprend la **structure** du design « Panier - Paiement » mais **pas sa
  palette** : couleurs de l'app (blanc, gris slate `#e2e8f0` / `#f8fafc`, orange
  `#ec4913`), rayons 12/18 et typo des autres écrans du panier. Rendu dans sa
  **propre `Modal`**, ancré en bas, `maxHeight: 88%`, scrim tapable pour fermer
  (désactivé pendant le paiement). Le corps du sheet porte :
  - les **cards de mode de livraison** (Express / À l'heure / Sur place) en haut
    de la zone — **lecture seule** : chaque commande fixe déjà son mode, la card
    active est celle réellement payée (nombre de commandes + frais de course),
    les autres restent grisées ;
  - la **zone** de livraison rappelée juste dessous ;
  - le **récapitulatif** : total commande, ligne livraison (« Offerte » à 0),
    total à payer ;
  - le **moyen de paiement** : cards Orange Money / MTN MoMo (badges OM / MoMo).

  La **saisie du numéro et les étapes du paiement** ne sont PAS dans le corps du
  sheet : elles sont portées par la **capsule `CartPaymentOverlay`** — la même
  que l'autre sheet de paiement — rendue **hors** du sheet et ancrée sur le bas
  de l'écran (`keyboardHeight + CAPSULE_BOTTOM_OFFSET + insets.bottom`), de sorte
  qu'elle remonte seule avec le clavier sans être rognée. Le sheet lui réserve sa
  place via son `paddingBottom`.
  `cart.tsx` passe `groups={payingGroup ? [payingGroup] : displayedZoneGroups}`
  et fournit `keyboardHeight` / `isKeyboardVisible` / `setPaymentState`.
- **Ouverture** : le bouton « commander » du récap du bas ET la pilule « Tout
  commander » du header passent par `startOrder(groups)` dans `cart.tsx`. Le
  sheet reste monté et est piloté par `visible` (sinon l'animation de sortie
  serait coupée).
- **Parcours GROUPÉ — un seul sheet, trois calques**
  (`components/CartGroupedDeliverySheet.tsx`). `startOrder` l'ouvre à la place du
  sheet de paiement quand le lot contient **plusieurs courses** (une seule course
  → `CartPaymentSheet` directement). Il porte les trois étapes :
  1. **groupage** (`CartGroupingStep.tsx`, écran 02 du design) — « Tout livrer
     ensemble » ou « livraisons séparées » (→ retour au panier, chaque tableau de
     zone gardant son propre bouton « commander ») ;
  2. **livraison commune** — la section delivery du sheet de commande réutilisée
     **telle quelle** : `DeliveryTab` (prop `fillHeight`) + ses cinq overlays,
     regroupés dans `CartGroupedDeliveryOverlays.tsx` et pilotés par un unique
     état `overlay`. Au-dessus, une simple accroche dans le style de l'étape 1
     (`styles.question`) — pas de récap : les montants sont portés par le bouton
     de validation puis par l'étape de paiement ;
  3. **paiement** — `CartPaymentBody.tsx`, le corps partagé avec
     `CartPaymentSheet`, plus la capsule `CartPaymentOverlay` ancrée hors du
     sheet. En groupé (`grouped` + `groupedLivraison`), le récapitulatif porte
     **une seule ligne** de livraison au lieu d'une par groupe — tout part dans
     la même course — libellée « Récupérer sur place » à 0 F si rien n'est livré.
     Le total affiché ET envoyé est `articles + la course unique`
     (`amountToPayEffective` dans `cart.tsx`) : `amountToPay` compterait une
     course par zone et ferait payer plus que ce que le sheet annonce.

  Les **trois calques sont montés d'emblée** et superposés (`bodyLayer` en
  `absoluteFill`) : le passage d'une étape à l'autre n'est qu'un **fondu croisé**
  (`fade`, `fadePay`) sur du contenu déjà peint. Enchaîner des `Modal` coûtait une
  animation de fermeture complète, faisait clignoter l'étape suivante, et
  présenter le second pendant la sortie du premier échouait silencieusement.
  **Aucun en-tête** : ni titre, ni sous-titre, ni croix — chaque calque porte
  lui-même son propos, la fermeture passe par le voile (ou le bouton d'action).
  Hauteur fixe `SHEET_HEIGHT - 44` (l'en-tête retiré), à comparer au
  `SHEET_HEIGHT = 515` que garde le sheet de paiement autonome
  (`CartPaymentSheet.styles.ts`) ; sans hauteur fixe le sheet sautait d'une étape
  à l'autre.
  Styles dans `CartGroupedDeliverySheet.styles.ts` ; données boutique
  (`deliveryHours` / `orderLeadTime` / `advanceDays` / `deliveryOffer`) via le
  hook `hooks/useGroupedDeliveryData.ts`, qui **cache** la réponse de
  `GET /fastfood/:id` par boutique — sans ce cache l'étape repartait de `null` et
  les cards « Zone » apparaissaient d'un coup.
- **Application de la livraison commune** : `cart.tsx` garde
  `groupedDeliveryValue` (converti du format checkout `address`/`expressLieu`/
  `hour` vers le format panier `location`/`zone`/`time` par `toOrderDelivery`).
  `confirmCartPayment` l'injecte dans **chaque** commande avant `sanitizeOrder`,
  et **saute `validateAllDeliveries()`** — cette validation porterait sur les
  anciennes livraisons, remplacées. `onValidate` arme aussi `paymentState`
  (`"input"`) **sans fermer le sheet** : le paiement est son 3e calque.
  `endPayment` remet à `null` `groupedDeliveryValue` ET `groupedDelivery`.
- **cart.tsx** : branche le hook + le sheet + verdict socket + fermeture sur
  `success_created` (5s → refresh + repos). Capsule de **suppression** d'article séparée.
- **Composants remplacés** : `CartPaymentTopCard` et `CartPaymentVariants` (card
  du haut + variantes de comparaison) ne sont plus branchés au panier —
  `CartPaymentOverlay`, lui, reste utilisé comme capsule du nouveau sheet. Le
  sheet de commande **individuelle**
  (`CartCheckoutSheet`) est inchangé.
- `CartCheckoutSheet` (édition d'un article) utilise la même animation d'ouverture
  que le home (voile fade + sheet slide-up net).

---

## Backend yaammoo — Intégration MobileWallet

### Appel sortant (`mobilewalletService.js`)
```js
pay({ amount, phone, network, email, userId })
  → POST /pay sur ai_browser2 avec X-Admin-Key
  → retourne { status, transaction_id, message, code }
```

Gère :
- 409 (doublon) : `retry_after_s` fourni au client
- 503 (panne opérateur/réseau) : message clair
- Autres erreurs : log + feedback utilisateur

### PostTransaction (`postTransaction.service.js`)
```js
if (payBy === 'mobilemoney') {
  mwResult = await mobilewalletService.pay(...);
  // Réponse immédiate : { status: 'ussd_sent', mw_transaction_id }
  // (verdict asynchrone via webhook + socket)
}
```

### Webhook entrant (`webhookMobilewallet.controller.js` + `service.js`)
1. Vérifie HMAC-SHA256 : `X-MobileWallet-Signature: t=<ts>,v1=<hex>`
2. Idempotence : verdict déjà traité → ignore
3. Émet socket : `io.to(`user:${end_user_ref}`).emit('payment.settled', {...})`
4. Si `status === 'successful'` : crée la commande EN PARALLÈLE
5. Retourne 200 (même en cas d'erreur → évite retries infinies)

### Variables d'environnement (`.env`)
```
MOBILEWALLET_URL=http://<ip>:7332
MOBILEWALLET_ADMIN_KEY=<admin_key>
MOBILEWALLET_WEBHOOK_SECRET=<webhook_secret>
```

---

## Mode review Apple (`appleReviewMode`)

Pour la review App Store (Apple n'a pas de Mobile Money), `GET /fastFood/all`
renvoie `{ success, message, data, appleReviewMode: true|false }`. Le flag est
exposé en mémoire par **`FastFoodContext`** (`appleReviewMode`, lu via
`useFastFoods()`), rafraîchi à chaque fetch — pas de persistance AsyncStorage
(Apple ne peut pas inspecter une var en mémoire).

### Skip automatique du paiement — décidé par la réponse de `POST /transaction`

**L'UI est strictement identique pour tous.** Le front ne sait pas à l'avance
s'il est en review : l'utilisateur ouvre le sheet, choisit son réseau, saisit un
numéro et appuie « payer » exactement comme en production.

C'est **la réponse du backend** qui tranche. L'app envoie déjà sa version à
chaque requête (`x-app-version`, cf. [http-versioning.md](./http-versioning.md)) ;
si cette version est celle soumise à la review, le backend ne contacte pas
MobileWallet — il crée la commande de façon synchrone et ajoute à sa réponse :

```json
{ "success": true, "appleReviewMode": true }
```

Les hooks (`useCheckout.handlePaymentConfirm`, `useCartPayment.handlePaymentConfirm`)
détectent ce champ et **déroulent eux-mêmes** les étapes, sans attendre de verdict
socket qui ne viendra jamais :

```
ussd_sent ("Vérification du paiement...")  →  success  →  success_created
        └── REVIEW_STEP_MS (2500 ms) entre chaque étape ──┘
```

Les timers sont stockés dans un `ref` et annulés au démontage / `resetCheckout()`
(sinon un `setPaymentState` sur composant démonté fuit si l'utilisateur ferme le
sheet en cours de séquence). Constante : `REVIEW_STEP_MS` dans
`src/features/payment/constants/reviewPayment.ts`.

**Conséquence** : le parc installé continue de payer réellement pendant toute la
review — aucun flag global à activer puis à couper, aucun risque d'oubli.

### `appleReviewMode` du `GET /fastFood/all`

Toujours exposé par `FastFoodContext`, mais il ne sert **plus** au flux de
paiement : uniquement à masquer les items « Paiement » (section Compte) et
« Portefeuille » (section Boutique) dans `settings.tsx`.

### Refonte panier / Settings (indépendant du mode review)

Le **panier (`app/(tabs)/cart.tsx`)** n'a plus de `SectionSwitcher` : il
n'affiche que **le panier** (commandes `pendingToBuy` + paiement global). Les
sections « État des commandes » et « Portefeuille » ont migré dans **Settings**,
sous une section **« Mes activités »** (visible user ET marchand — un marchand
passe aussi des commandes) :

- `src/features/orders/components/CartStatusPanel.tsx` : panneau suivi/tracking
  autonome (filtre statut/date, groupes par boutique, jours précédents, détail
  via `OrderBottomSheet`), extrait de l'ancien cart.tsx.
- `src/features/orders/components/UserOrdersModal.tsx` : modal plein écran
  (« État des commandes ») wrappant `CartStatusPanel`.
- `src/features/wallet/components/UserWalletModal.tsx` : modal plein écran
  (« Portefeuille ») wrappant `WalletPanel`. **Caché en review**.

Deep-links : `onOrdersPress` (home) et les notifications commandes pointent vers
`/(tabs)/settings?section=pending|finished` → `settings.tsx` ouvre
`UserOrdersModal`. Le `?section=cart` du bouton panier est devenu inutile (cart
est mono-section).

## Gestion des erreurs

| Cas | Frontend | Backend |
|-----|----------|---------|
| **409 doublon (pending)** | Toast "Confirmer ou annuler la transaction en cours" | HTTP 409 + `pending_exists` |
| **409 doublon (retry_too_soon)** | Toast "Réessayez dans X secondes" | HTTP 409 + `retry_after_s` |
| **503 panne opérateur** | Toast "Opérateur indisponible" | HTTP 503 + message clair |
| **Paiement échoué (après USSD)** | Toast "Paiement échoué", retour INPUT | Webhook `status: 'failed'` |
| **Paiement annulé** | Toast "Paiement annulé", retour INPUT | Webhook `status: 'cancelled'` |

---

## Code USSD par réseau

| Réseau | Code | État |
|--------|------|------|
| Orange Money | `#150#` | ✅ Intégré |
| MTN | `*126#` | ✅ Intégré |

---

## Flux Socket.IO

**Connexion** : établie par le singleton `socketService` (`src/services/socket.ts`)

**Events** :
- `payment.settled` : arrivée du verdict (status, transaction_id, amount)
  → Reçu dans `useCheckout` via handler enregistré
  → Déclenche changement d'état (success/failed)

**Idempotence** : même verdict reçu 2 fois (webhook + socket) ne traite qu'une fois
(via `processedVerdicts` Set côté backend)

---

## Sécurité

1. **Clé API MobileWallet** : jamais exposée au frontend (stockée en `.env` backend)
2. **Webhook HMAC** : vérifié avant traitement (Stripe-like)
3. **Idempotence** : webhooks retentés sans risque de doublon côté DB
4. **API key auth** : backend yaammoo utilise `X-Admin-Key` pour appeler ai_browser2
