# Architecture — yaammoo (Frontend React Native / Expo)

Documentation d'architecture de l'app mobile (client + marchand).

> **Convention** : mettre à jour le fichier concerné dès qu'un composant/hook/feature est modifié.
> Pour la doc backend, voir [`BACKEND/architecture/`](../../BACKEND/architecture/README.md).

---

## Index

| Fichier | Feature |
|---|---|
| [structure.md](./structure.md) | Arborescence `app/`, `src/features/`, `src/components/`, `src/api/` |
| [auth.md](./auth.md) | Authentification client (Email/Password, Google Sign-In, AuthContext) |
| [checkout.md](./checkout.md) | Bottom sheets de commande (home + panier) |
| [payment.md](./payment.md) | Intégration paiement MobileWallet (hook, overlay, socket, 2 points d'entrée) |
| [orders-client.md](./orders-client.md) | Commandes côté client (contexte, cartes, tri par rank) |
| [orders-merchant.md](./orders-merchant.md) | Gestion commandes côté marchand (panel, cartes, statuts) |
| [notifications.md](./notifications.md) | Notifications côté client (context, setup hook, détail sheet, deep-linking) |
| [socket-events-client.md](./socket-events-client.md) | Socket client — connexion, rooms, handlers |

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
│   ├── _layout.tsx           # Racine : AuthProvider, OrderProvider, NotificationProvider, SocketProvider
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
│   │   ├── merchant/         # Panel marchand (boutique, commandes)
│   │   ├── menu/ restaurants/ profile/ payment/
│   │   └── socket/           # SocketContext
│   ├── api/                  # config.ts (apiUrl, Firebase, Google Client IDs)
│   ├── theme/                # Theme.colors, typography
│   ├── types/                # Types TS partagés (Commande, Menu, Livraison…)
│   ├── components/           # Composants partagés (Toast…)
│   └── services/             # useSocketEvents.ts (handlers socket globaux)
│
├── assets/                   # Images, fonts
├── architecture/             # Ce dossier
└── app.json, package.json
```
