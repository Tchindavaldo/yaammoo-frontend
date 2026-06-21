# Structure globale — yaammoo/src & app/

## app/ — Expo Router

```
app/
├── _layout.tsx              # Root — monte tous les providers dans cet ordre :
│                            #   AuthProvider → OrderProvider → NotificationProvider → MerchantProvider → FastFoodProvider
│                            #   (le socket n'est PAS un provider : singleton src/services/socket.ts)
│
├── (auth)/                  # Stack non authentifié
│   ├── index.tsx            # Login (email/password + Google)
│   ├── register.tsx         # Inscription
│   └── phone.tsx            # Login WhatsApp / téléphone
│
├── (tabs)/                  # Tabs authentifiées
│   ├── _layout.tsx
│   ├── index.tsx            # Home (liste restaurants, feed)
│   ├── boutique.tsx         # Panel marchand (si user.role = merchant)
│   ├── cart.tsx             # Panier + commandes en cours (client)
│   ├── notifications.tsx    # Liste notifs + DetailSheet
│   └── profile.tsx
│
└── modal.tsx
```

## src/features/ — feature-first

```
src/features/
├── auth/
│   ├── context/AuthContext.tsx          # user state + AsyncStorage
│   ├── services/
│   │   ├── authService.ts               # GET /user/:uid
│   │   ├── googleAuthService.ts         # Flow Google Sign-In complet
│   │   └── userFirestore.ts             # CRUD /user (GET/POST/PUT)
│   └── hooks/
│
├── checkout/
│   ├── hooks/useCheckout.ts             # État commande, prix, validation, verdict paiement
│   └── components/                      # BottomSheets (home, cart) + overlays paiement
│       ├── CheckoutSheet / CartCheckoutSheet
│       ├── CheckoutPaymentOverlay       # Capsule BAS (saisie n° + étapes paiement)
│       ├── CheckoutPaymentTopOverlay    # Panel HAUT (récap commande + choix réseau)
│       └── AnimatedBorderGlow           # Bordure lumineuse animée (attente paiement)
│
├── notifications/
│   ├── context/NotificationContext.tsx
│   ├── hooks/
│   │   ├── useNotifications.ts          # Wrapper context
│   │   └── useNotificationSetup.ts      # Permissions + token + listeners + deep-link
│   ├── utils/notificationRouting.ts     # getNotificationRoute, getNotificationIcon
│   └── components/
│       ├── NotificationItem.tsx         # Ligne liste compacte
│       └── NotificationDetailSheet.tsx  # Modal détail
│
├── orders/
│   ├── context/OrderContext.tsx         # orders[] + buyOrders + fetchOrders + updateLocalOrder
│   ├── utils/sanitizeOrder.ts           # Sanitization stricte d'une commande (envoi /order, /transaction)
│   └── components/
│       ├── OrderCard.tsx                # Carte client
│       └── ...
│
├── merchant/
│   ├── panel/                           # Vue d'ensemble boutique
│   ├── orders/                          # Gestion commandes marchand
│   └── settings/                        # Edit boutique + hours
│
├── payment/
│   ├── hooks/useCartPayment.ts          # Paiement global panier (isolé de useCheckout)
│   └── components/CartPaymentOverlay.tsx # Capsule paiement panier (réseau intégré)
│
└── menu/ restaurants/ profile/
```

> Le socket n'est pas une feature avec Context/Provider : c'est un singleton
> `src/services/socket.ts` (`socketService`) + le hook `src/services/useSocketEvents.ts`.

## src/ (hors features)

```
src/
├── api/
│   └── config.ts                # Config.apiUrl, Firebase config, Google Client IDs
├── components/                  # Partagés (Toast, Loader, Button…)
├── theme/                       # Theme.colors, typography, spacing
├── types/                       # Commande, Menu, Livraison, User…
└── services/
    ├── socket.ts               # Singleton socketService (socket.io-client, connexion, payment handler)
    └── useSocketEvents.ts      # Hook global : abonne aux events socket + dispatch vers contexts
```

## Ordre des providers (app/_layout.tsx)

```
AuthProvider
  └─ OrderProvider                  # reçoit events socket via useSocketEvents
       └─ NotificationProvider
            └─ MerchantProvider
                 └─ MerchantWalletProvider
                      └─ WalletProvider
                           └─ FastFoodProvider
                                └─ <AppContent/>   # Stack Expo Router
```

> Le socket est un singleton (`src/services/socket.ts`), initialisé hors de l'arbre
> de providers ; `useSocketEvents` (monté dans AppContent) abonne aux events et
> dispatch vers les contexts.

> **Gating de navigation** : `AppContent` est sous `FastFoodProvider` car il lit
> `useFastFoods().hasLoadedOnce` pour ne révéler `(tabs)` qu'une fois la home
> chargée. Les guards `Stack.Protected` pilotent toute la bascule `(auth)`↔`(tabs)`
> (aucun `router.replace`). Détail dans [auth.md](./auth.md#navigation--gating-anti-page-blanche).

## Convention

- **feature-first** : chaque domaine a son dossier avec `context/`, `hooks/`, `components/`, `services/`, `utils/`.
- Les **contexts** sont toujours fournis au niveau `app/_layout.tsx`.
- Les **types globaux** (Commande, Menu…) vivent dans `src/types/`.
- Les **types locaux à une feature** vivent dans le dossier de la feature.
