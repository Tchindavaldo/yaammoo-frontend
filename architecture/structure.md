# Structure globale — yaammoo/src & app/

## app/ — Expo Router

```
app/
├── _layout.tsx              # Root — monte tous les providers dans cet ordre :
│                            #   AuthProvider → SocketProvider → OrderProvider → NotificationProvider
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
│   ├── context/OrderContext.tsx         # orders[] + updateLocalOrder
│   ├── services/ordersService.ts        # buyOrders, updateOrders, fetchOrders
│   └── components/
│       ├── OrderCard.tsx                # Carte client
│       └── ...
│
├── merchant/
│   ├── panel/                           # Vue d'ensemble boutique
│   ├── orders/                          # Gestion commandes marchand
│   └── settings/                        # Edit boutique + hours
│
├── menu/ restaurants/ profile/ payment/
│
└── socket/
    └── SocketContext.tsx                # socket.io-client + connection + join(userId)
```

## src/ (hors features)

```
src/
├── api/
│   └── config.ts                # Config.apiUrl, Firebase config, Google Client IDs
├── components/                  # Partagés (Toast, Loader, Button…)
├── theme/                       # Theme.colors, typography, spacing
├── types/                       # Commande, Menu, Livraison, User…
└── services/
    └── useSocketEvents.ts       # Hook global : abonne aux events socket + dispatch vers contexts
```

## Ordre des providers (app/_layout.tsx)

```
AuthProvider
  └─ SocketProvider            # dépend de user.uid pour join(room)
       └─ OrderProvider         # reçoit events socket via useSocketEvents
            └─ NotificationProvider
                 └─ <Stack/>    # Expo Router
```

## Convention

- **feature-first** : chaque domaine a son dossier avec `context/`, `hooks/`, `components/`, `services/`, `utils/`.
- Les **contexts** sont toujours fournis au niveau `app/_layout.tsx`.
- Les **types globaux** (Commande, Menu…) vivent dans `src/types/`.
- Les **types locaux à une feature** vivent dans le dossier de la feature.
