# Architecture — yaammoo (Frontend React Native / Expo)

Documentation d'architecture de l'app mobile (client + marchand).

> **Convention** : mettre à jour le fichier concerné dès qu'un composant/hook/feature est modifié.
> Pour la doc backend, voir [`BACKEND/architecture/`](../../BACKEND/architecture/README.md).

---

## Index

| Fichier | Feature |
|---|---|
| [structure.md](./structure.md) | Arborescence `app/`, `src/features/`, `src/components/`, `src/api/` |
| [http-versioning.md](./http-versioning.md) | Versioning d'app dans les requêtes HTTP (`x-app-version`, `setupHttp.ts`, headers globaux) |
| [tab-header.md](./tab-header.md) | En-têtes d'onglets uniformes (TabHeader, HeaderPill, DatePill, SectionSwitcher) |
| [blur-safe-area.md](./blur-safe-area.md) | Flou unifié iOS/Android (AppBlurView) + safe-area des bottom sheets |
| [auth.md](./auth.md) | Authentification client (Email/Password, Google/Apple Sign-In, AuthContext, **accès invité / AuthGate**) |
| [checkout.md](./checkout.md) | Bottom sheets de commande (home + panier) |
| [payment.md](./payment.md) | Intégration paiement MobileWallet (hook, overlay, socket, 2 points d'entrée) |
| [orders-client.md](./orders-client.md) | Commandes côté client (contexte, cartes, tri par rank) |
| [orders-merchant.md](./orders-merchant.md) | Gestion commandes côté marchand (panel, cartes, statuts) |
| [menu.md](./menu.md) | Gestion des menus côté marchand (panel, formulaire multi-étapes, designs récap) |
| [bonus.md](./bonus.md) | Bonus & récompenses client (bottom sheet, carrousel, registre évolutif, moteur d'éligibilité, claim, campagne `status_view` : flyer + preuve vidéo) |
| [driver.md](./driver.md) | Rôle driver — commandes déléguées (onglet, panel, carte, socket, contrat backend) |
| [notifications.md](./notifications.md) | Notifications côté client (context, setup hook, détail sheet, deep-linking) |
| [socket-events-client.md](./socket-events-client.md) | Socket client — connexion, rooms, handlers |
| [support-merchant.md](./support-merchant.md) | Messages boutique — discussions clients reçues par le marchand (feature séparée, HTTP + socket) |
| [support.md](./support.md) | Contactez-nous — chat support client (écran plein écran, chips d'objet, historique, HTTP + socket) |
| [boutique-delivery-zones.md](./boutique-delivery-zones.md) | Formulaire boutique (création/édition), zones périodiques/express, villes Cameroun |
| [home-banners.md](./home-banners.md) | Bannière pub du home — carrousel dynamique, images via `/fastfood/all`, fallback statique |

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
- **Crash reporting** : `@sentry/react-native` — init dans `src/services/sentry.ts`, activé dès que `Config.sentryDsn` est rempli (no-op sinon, désactivé en dev)

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
│   ├── api/                  # config.ts (apiUrl, Firebase, Google Client IDs) + version.ts + setupHttp.ts (headers globaux x-app-version)
│   ├── theme/                # Theme.colors, typography
│   ├── types/                # Types TS partagés (Commande, Menu, Livraison…)
│   ├── components/           # Composants partagés (Toast, AppBlurView…) + molecules/ (TabHeader, HeaderPill, DatePill, SectionSwitcher)
│   └── services/             # socket.ts (singleton socketService) + useSocketEvents.ts + sentry.ts (crash reporting)
│
├── assets/                   # Images, fonts
├── architecture/             # Ce dossier
└── app.json, package.json
```
