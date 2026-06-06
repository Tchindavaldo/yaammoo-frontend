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
        ▼ affiche CheckoutPaymentOverlay (capsule blur existante, état INPUT)
        ┌────────────────────────────────────────────┐
        │ [close ✕]  [Orange] [MTN]  [input] [btn →] │
        │            ^ajout    ^existant            │
        └────────────────────────────────────────────┘

USER choisit réseau + saisit numéro + appuie →
        │
        ▼
[Frontend] POST /transaction  ────────────────────────► [Backend yaammoo]
  { payBy:'mobilemoney', amount, phone, network,                 │
    email, userId }                      POST /pay → ai_browser2
                                         (X-Admin-Key)        │
                                         réponse synchrone :  │
                                         { status:'ussd_sent'} │
                                         ◄────────────────────┘
[Frontend reçoit ussd_sent → overlay état WAITING]
        ┌────────────────────────────────────────────┐
        │ Composez #150# (Orange) / *126# (MTN)      │
        │ et validez le paiement de <montant> F      │
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
        ├── successful → overlay état SUCCESS :
        │   spinner + "Paiement réussi ! Création de la commande en cours..."
        │   (puis socket 'newUserOrder' existant met à jour les commandes auto)
        │
        └── failed / cancelled → toast haut + retour état INPUT
```

---

## Stack technique

- **Backend MobileWallet API** : `POST /pay` (admin key)
- **Frontend** : hook `useCheckout.ts` pour orchestrer le paiement
- **Socket.IO** : écoute `payment.settled` pour le verdict en temps réel
- **UI** : overlay `CheckoutPaymentOverlay.tsx` avec 3 états (input, waiting, success, failed)
- **State** : intégré dans `useCheckout` (pas de PaymentContext séparé)

---

## Fichiers impactés

### Frontend
- `src/features/checkout/hooks/useCheckout.ts` : ajout state paiement + handlers
- `src/features/checkout/components/CheckoutPaymentOverlay.tsx` : 4 états, sélecteur réseau
- `src/features/checkout/components/CheckoutSheet.tsx` : branchement socket + paiement
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
paymentNetwork: 'orange' | 'mtn';           // Réseau sélectionné
paymentState: 'input' | 'waiting' | 'success' | 'failed';  // État overlay
paymentError: string | null;                 // Message erreur
ussdCode: string;                            // '#150#' ou '*126#' selon réseau
```

**Handlers** :
- `handlePaymentConfirm()` : `POST /transaction` avec `payBy:'mobilemoney'`
- `handlePaymentVerdict(data)` : reçoit `payment.settled`, met à jour `paymentState`
- `registerPaymentHandler(fn)` / `unregisterPaymentHandler()` : gestion socket

---

## CheckoutPaymentOverlay.tsx

**Chemin** : `src/features/checkout/components/CheckoutPaymentOverlay.tsx`

**Props** :
- `paymentState: 'input' | 'waiting' | 'success' | 'failed'`
- `network: 'orange' | 'mtn'`
- `onNetworkChange: (network) => void`
- `ussdCode: string`
- `onError: (error) => void`
- `onConfirm: () => Promise<void>`

**États** :
1. **input** : sélecteur réseau (2 chips) + input numéro + boutons existants
2. **waiting** : texte "Composez #150#/#\*126# et validez <montant> F" (pas de spinner)
3. **success** : spinner à gauche + "Paiement réussi ! Création de la commande en cours..."
4. **failed** : toast en haut "Paiement échoué" (sans emoji) + retour input

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
