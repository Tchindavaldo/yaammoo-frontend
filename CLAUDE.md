# Consignes projet — yaammoo (React Native / Expo)

Ce fichier est **versionné** : ses règles s'appliquent automatiquement sur tout
PC où le projet est cloné/pull, dans n'importe quelle session Claude Code.

## À lire en DÉBUT de session (OBLIGATOIRE)

Lis **`architecture/README.md`** (à la racine) avant de travailler : il donne une vision
360 du projet (structure des fichiers, features isolées, contextes, hooks).

**⚠️ INTERDIT : lancer un agent Explore pour "découvrir" le projet.** `architecture/README.md`
et les fichiers `.md` par feature ont été rédigés précisément pour éviter cette perte de temps.
Lis avec `Read` direct (1 seul appel outil) — c'est suffisant. Ne lance un agent Explore ou
`grep`/`find` supplémentaire QUE si tu cherches quelque chose d'ultra-précis introuvable dans
`architecture/` (ex. une signature de fonction exacte). Pas pour "comprendre le projet".

**Backend yaammoo** : avant de toucher `BACKEND/`, lire `BACKEND/architecture/structure.md`
avec `Read` direct (1 appel).

**ai_browser2** : si la tâche touche le paiement MobileWallet, lire
`../../ai_browser2/ARCHITECTURE.md` avec `Read` direct (1 appel).

**Tenir à jour** : dès qu'un travail modifie la structure (nouveau fichier,
composant, hook, feature) ou rend une description obsolète, **mets à jour**
`architecture/README.md` et les fichiers `.md` concernés avant de clore.

## Architecture & modularité (OBLIGATOIRE)

L'architecture doit rester **propre, moderne, modulaire**. Règles non négociables :

- **Taille de fichier : viser ~400 lignes, 500 = plafond DUR.** Au-delà de 500,
  découper obligatoirement. Un fichier doit se lire d'un coup (par un humain ET
  par l'agent qui doit le parcourir). Si un fichier que tu touches dépasse, scinde-le
  avant de clore.
- **Un fichier = une responsabilité claire.** On découpe en modules par domaine ;
  on n'empile jamais dans un gros fichier fourre-tout.
- **Features isolées sous `src/features/`** : chaque feature (auth, checkout, orders,
  notifications, etc.) vit dans son dossier avec hooks, components, et types locaux.
- **Contextes React pour l'état partagé** : AuthContext, OrderContext, NotificationContext,
  SocketContext. Pas de props drilling.
- **Hooks partagés sous `src/services/`** : useSocketEvents, useNotificationSetup, etc.

## Convention de branches (OBLIGATOIRE)

Toujours préfixer les branches selon leur nature :

- `debug/<sujet>` — **investigation/résolution d'un bug précis**. Une branche par
  bug. Ex: `debug/checkout-validation`, `debug/socket-reconnection`.
- `feature/<sujet>` — nouvelle fonctionnalité ou durcissement d'une feature.
  Ex: `feature/payment-integration`, `feature/socket-optimization`.
- `backup/<sujet>` — sauvegarde d'un état (ne pas y travailler).

Règle: **tout travail de debug commence sur une branche `debug/`**, créée depuis
la branche d'où vient le problème (pas depuis `main`).

## État & Contextes (OBLIGATOIRE)

**Les contextes React sont la source de vérité** pour l'état partagé. Règles :

- **AuthContext** : user connecté, tokens, refresh logic.
- **OrderContext** : panier utilisateur, commandes pendingToBuy / pending.
- **NotificationContext** : notifications reçues, détails, deep-linking.
- **SocketContext** : connexion Socket.IO, rooms, handlers d'événements.

**Ne JAMAIS** :
- Stocker l'état partagé en dehors des contextes (pas de singletons globaux, pas
  de Redux sans raison).
- Bypasser un contexte avec `AsyncStorage` pour de l'état temps réel.
- Props drilling sur plus de 2 niveaux — utiliser un contexte.

## Tests & Validation (RECOMMANDÉ)

- Frontend : tester en Expo Go (mobile) ET en dev build (comportement natif FCM/etc.).
- Checkout : valider `validateDelivery()` + `validateStock()` avant envoi API.
- Socket : vérifier la reconnexion (débrancher WiFi, puis reconnecter).
- Notifications : tester en foreground (notification reçue) ET en background (app fermée).

## Secrets & Configuration

`.env` est gitignoré et ne doit JAMAIS être commité. Ne pas hardcoder de secret
dans le code ; tout passe par `src/api/config.ts` (lecture d'environnement).

Configuration centralisée :
- `apiUrl` (backend REST)
- `socketUrl` (backend Socket.IO)
- `Firebase` (projectId, appId, messagingSenderId)
- `Google Sign-In` (clientId)

## Documentation

Après toute modif des features/hooks/components, **mettre à jour** :
- `architecture/structure.md` : si la structure de fichiers change
- `architecture/<feature>.md` : si la feature change (hooks, props, flux)
- `architecture/README.md` : index + stack

## Expo Router & Navigation

- **File-based routing** : `app/` contient la structure de navigation
  - `(auth)/` : pages non authentifiées (login, register, phone)
  - `(tabs)/` : pages authentifiées (home, shop, cart, notifications, profile)
  - `_layout.tsx` : providers globaux (Auth, Order, Notification, Socket)
- **Deep-linking** : `app.json` configure les schémas custom (ex. `yaammoo://order/:id`)

## Pattern asyncthunks & API Calls

- Utiliser `axios` avec `Config.apiUrl` comme base
- Encapsuler chaque appel API dans un hook (`useCheckout`, `useOrders`, etc.)
- Gérer les erreurs : toast utilisateur + log backend
- Pas de `try-catch` sans gestion d'erreur (toujours afficher un feedback)

## Push Notifications & Socket.IO

**Hybride** :
- Token Expo (`ExponentPushToken[...]`) en Expo Go → détecté et envoyé à Expo Push API
- Token FCM natif en dev build/production → envoyé à Firebase Cloud Messaging
- Backend dispatcher détecte le format et route automatiquement

**Socket.IO** :
- Connexion au boot (AuthContext)
- Rejoins les rooms au login : `app:<appId>`, `user:<userId>`
- Écoute les événements de paiement : `payment.settled`, `order.status_changed`
- Gère la reconnexion automatiquement

## Flux de paiement (IMPORTANT)

**Deux points d'entrée pour le paiement** :
1. **CheckoutSheet** (home) : après "Buy"
2. **CartCheckoutSheet** (panier) : après "Buy individuel"

**Ordre logique** :
1. Valider stock + livraison → `validateStock()` + `validateDelivery()`
2. **Créer/mettre à jour la commande** → `POST /order` ou `PUT /order/tabs/:userId`
3. **Lancer le paiement** → `POST /payment` (backend MobileWallet)
4. Afficher overlay paiement + numéro de paiement DIFFÉRENT du numéro de livraison
5. Écouter le verdict via Socket.IO (`payment.settled`) ou faire un polling
6. Afficher le résultat (succès / échec)

**Numéro de paiement** :
- **Généré par le backend MobileWallet** (clé API de l'app yaammoo)
- **DIFFÉRENT du numéro de livraison** (celui du livreur)
- Affiché au user pendant la saisie du code USSD
- Permet au user de vérifier avec le SMS reçu de l'opérateur

## Clé API MobileWallet

La clé API pour les paiements yaammoo doit être :
- Configurée dans les variables d'environnement du backend yaammoo
- **Jamais exposée au frontend** (tous les appels `/pay` passent par le backend yaammoo)
- Protégée comme un secret sensible (.env gitignoré)
