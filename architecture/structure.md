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
│   ├── boutique.tsx         # Commandes marchand (statuts via chips ; menu/portefeuille → Settings)
│   ├── cart.tsx             # Panier seul (mono-section) ; commandes/portefeuille → Settings « Mes activités »
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
│       ├── CartStatusPanel.tsx          # Suivi commandes autonome (statut/date/groupes/jours passés/détail)
│       ├── UserOrdersModal.tsx          # Modal plein écran « État des commandes » (Settings → Mes activités)
│       └── ...
│
├── merchant/
│   ├── panel/                           # Vue d'ensemble boutique
│   ├── orders/                          # Gestion commandes marchand
│   └── settings/                        # Edit boutique + hours
│
├── driver/                             # Rôle driver (commandes déléguées)
│   ├── context/DriverContext.tsx       # orders déléguées + updateStatus + upsert socket
│   ├── hooks/useDriver.ts
│   ├── services/driverService.ts       # GET /order/driver/:id · PUT /order (avec driverId)
│   └── components/                      # DriverOrderPanel (clone "Terminées") + DriverOrderCard
│
├── payment/
│   ├── constants/reviewPayment.ts        # Valeurs paiement par défaut en mode review Apple
│   ├── hooks/useCartPayment.ts          # Paiement global panier (isolé de useCheckout) + handleReviewOrder
│   └── components/CartPaymentOverlay.tsx # Capsule paiement panier (réseau intégré)

├── wallet/
│   └── components/
│       ├── WalletPanel.tsx              # Liste transactions + solde (user)
│       └── UserWalletModal.tsx          # Modal plein écran « Portefeuille » (Settings → Mes activités ; caché en review)
│
├── bonus/                               # Bonus & récompenses client — cf. bonus.md
│   ├── context/BonusContext.tsx         # BonusProvider + useBonusContext (consommé par useSocketEvents)
│   ├── config/bonusRegistry.tsx         # Descripteur (icône/couleur/label) par type + fallback
│   ├── hooks/                           # useBonus · useBonusEligibility · useBonusStatus · useOrderPeriodStats
│   └── components/
│       ├── UserBonusSheet.tsx           # Bottom sheet « Bonus et parrainage » (Settings)
│       ├── BonusCarousel.tsx            # Carrousel des cartes bonus
│       └── ...                          # BonusCard, BonusClaimRow, BonusPagerInfo, BonusGalleryCard…
│
├── bonus-v2/                            # ⚠️ Ancien design bonus (plein écran), gardé pour comparaison
│   └── ...                              # Symboles suffixés V2 — à supprimer une fois le design tranché
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
│   └── molecules/               # Briques d'UI réutilisables des en-têtes d'onglets
│       ├── TabHeader.tsx        # En-tête uniforme (fond orange, safe-area, titre/sous-titre/élément droit)
│       ├── HeaderPill.tsx       # Pilule d'action dans l'en-tête (style "Tout marquer lu")
│       ├── DatePill.tsx         # Pilule de dates repliable (chips date + "+N", sélection)
│       └── SectionSwitcher.tsx  # FAB switch sections (animé) — plus utilisé par cart.tsx (panier mono-section)
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
                 └─ DriverProvider          # commandes déléguées au driver
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
