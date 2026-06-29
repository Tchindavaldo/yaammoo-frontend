# Architecture — yaammoo (Frontend React Native / Expo)

Documentation d'architecture de l'app mobile (client + marchand).

> **Convention** : mettre à jour le fichier concerné dès qu'un composant/hook/feature est modifié.
> Pour la doc backend, voir [`BACKEND/architecture/`](../../BACKEND/architecture/README.md).

---

## Index

| Fichier | Feature |
|---|---|
| [structure.md](./structure.md) | Arborescence `app/`, `src/features/`, `src/components/`, `src/api/` |
| [tab-header.md](./tab-header.md) | En-têtes d'onglets uniformes (TabHeader, HeaderPill, DatePill, SectionSwitcher) |
| [auth.md](./auth.md) | Authentification client (Email/Password, Google/Apple Sign-In, AuthContext, **accès invité / AuthGate**) |
| [checkout.md](./checkout.md) | Bottom sheets de commande (home + panier) |
| [payment.md](./payment.md) | Intégration paiement MobileWallet (hook, overlay, socket, 2 points d'entrée) |
| [orders-client.md](./orders-client.md) | Commandes côté client (contexte, cartes, tri par rank) |
| [orders-merchant.md](./orders-merchant.md) | Gestion commandes côté marchand (panel, cartes, statuts) |
| [notifications.md](./notifications.md) | Notifications côté client (context, setup hook, détail sheet, deep-linking) |
| [socket-events-client.md](./socket-events-client.md) | Socket client — connexion, rooms, handlers |
| [boutique-delivery-zones.md](./boutique-delivery-zones.md) | Formulaire boutique (création/édition), zones périodiques/express, villes Cameroun |

---

## URLs App Store Connect

| Champ | URL |
|---|---|
| Support URL | `https://yaammoo.rauval.com/support` |
| Marketing URL | `https://yaammoo.rauval.com` |
| Privacy Policy URL (App Privacy) | `https://yaammoo.rauval.com/privacy` |
| Accessibility URL (optionnel) | `https://yaammoo.rauval.com/accessibility` |

---

## Stack frontend

- **Framework** : React Native + Expo Router
- **State** : Contexts React (Auth, Order, Notification, Socket)
- **Storage** : AsyncStorage
- **Push** : Hybride — `@react-native-firebase/messaging` (dev/prod build) + `expo-notifications` (Expo Go)
- **Socket** : socket.io-client
- **HTTP** : axios (`Config.apiUrl`)
- **UI** : composants custom + Ionicons

## Structure racine

```
yaammoo/
├── app/                      # Expo Router (file-based routing)
│   ├── _layout.tsx           # Racine : AuthProvider, OrderProvider, NotificationProvider, MerchantProvider, FastFoodProvider
│   ├── (auth)/               # Pages login/register/phone
│   ├── (tabs)/               # Tabs principales (home, boutique, cart, notifications, profile)
│   └── modal.tsx
│
├── src/
│   ├── features/             # Features isolées
│   │   ├── auth/             # login, google auth, AuthContext
│   │   ├── checkout/         # Bottom sheets commande
│   │   ├── notifications/    # Context + hooks + components
│   │   ├── orders/           # OrderContext + cartes
│   │   ├── merchant/         # Panel marchand (boutique, commandes, menu) + components/recap-designs/ (3 designs récapitulatif menu)
│   │   └── menu/ restaurants/ profile/ payment/
│   ├── api/                  # config.ts (apiUrl, Firebase, Google Client IDs)
│   ├── theme/                # Theme.colors, typography
│   ├── types/                # Types TS partagés (Commande, Menu, Livraison…)
│   ├── components/           # Composants partagés (Toast…) + molecules/ (TabHeader, HeaderPill, DatePill, SectionSwitcher)
│   └── services/             # socket.ts (singleton socketService) + useSocketEvents.ts
│
├── assets/                   # Images, fonts
├── architecture/             # Ce dossier
└── app.json, package.json
```
