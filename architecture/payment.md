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

[Frontend reçoit 'payment.settled' via SocketContext]
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
- **Payload** : `items` = commande(s) sanitizée(s) via `src/features/orders/utils/sanitizeOrder.ts`
  (même format que l'envoi historique `buyOrders → /order/tabs`) ; le backend en déduit le `fastFoodId`
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
- `src/features/socket/SocketContext.tsx` : listener `payment.settled` + handlers

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
  `handlePaymentConfirm(phone, items)` (POST /transaction avec `items`),
  `handlePaymentVerdict` (socket). En cas d'échec : retour direct au `total`
  (pas d'état `failed` affiché), erreur via toast top.
- **UI** : `src/features/payment/components/CartPaymentOverlay.tsx` — capsule unique
  (au-dessus de la tab bar) qui enchaîne toutes les étapes. Le **choix du réseau est
  intégré dans la capsule** (état `network_select`), pas d'overlay du haut comme le home.
- **cart.tsx** : branche le hook + l'overlay + verdict socket + fermeture sur
  `success_created` (5s → refresh + repos). Capsule de **suppression** d'article séparée.
- Réutilise `AnimatedBorderGlow` (bordure animée pendant l'attente).
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

**Connexion** : établie dans `SocketProvider` au login (existing)

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
