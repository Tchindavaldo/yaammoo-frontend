# Consignes projet — yaammoo (React Native / Expo)

Ce fichier est **versionné** : ses règles s'appliquent automatiquement sur tout
PC où le projet est cloné/pull, dans n'importe quelle session Claude Code.

> **15 règles numérotées R1 → R15.** Toute nouvelle règle ajoutée à ce fichier
> DOIT recevoir le numéro suivant (R16, R17, …) et le total ci-dessus doit être
> mis à jour. On cite une règle par son numéro (ex. « R1 » pour le style de réponse).

## R1 — Style de réponse (OBLIGATOIRE)

**Réponses COURTES.** Aller droit au but : le résultat, pas le cheminement.

- Pas de récapitulatif exhaustif des fichiers modifiés ni de tableaux explicatifs
  si l'utilisateur ne les demande pas. Quelques lignes suffisent.
- Ne pas reformuler la demande, ne pas annoncer ce qu'on va faire : le faire.
- Signaler un problème réel en 1 phrase, sans développer les alternatives.
- Répondre à une question posée = la réponse seule, sans contexte superflu.

**Plafonds DURS** (non négociables, y compris après un gros travail) :

| Type de message | Plafond |
|---|---|
| Question fermée (oui/non, « as-tu touché à X ? ») | **1 à 2 phrases**, la réponse et rien d'autre |
| Compte rendu après modif de code | **3 lignes MAX** |
| Explication demandée explicitement | **10 lignes MAX** |

**INTERDIT sauf demande explicite** :
- Lister les fichiers modifiés avec liens et numéros de ligne — l'utilisateur a le diff.
- Citer des extraits de code déjà écrits, ou expliquer *comment* on a codé.
- Les sections « Conséquences », « À valider », « Note », « Ce que je n'ai pas fait ».
- Proposer la suite du travail (« Tu veux que je… ? ») : s'arrêter après le résultat.
- Les puces qui détaillent chaque changement une par une.

> ⚠️ Après une modification, la réponse par défaut est **une seule phrase** disant
> ce qui marche maintenant. Rien de plus. Si un vrai blocage existe, l'ajouter en
> 1 phrase. Un travail long ne justifie JAMAIS une réponse longue.

## R2 — Périmètre : NE JAMAIS aller dans le backend sans permission (OBLIGATOIRE)

**Interdit d'ouvrir, lire, explorer ou modifier `BACKEND/` (ou `../BACKEND/`)
sans demande ou autorisation EXPLICITE de l'utilisateur.** Pas de `Read`, pas de
`grep`, pas d'agent, même « juste pour comprendre » ou « pour vérifier un
contrat d'API ».

- Le travail par défaut se fait UNIQUEMENT dans le frontend.
- Si un contrat backend est nécessaire, l'utilisateur le fournit. À défaut,
  faire un `curl` sur l'endpoint — jamais lire le code source du backend.
- En cas de doute réel et bloquant : demander la permission, puis attendre.

## R3 — À lire en DÉBUT de session (OBLIGATOIRE)

> **AU TOUT PREMIER MESSAGE de chaque conversation**, le hook
> `.claude/hooks/session-start-read.sh` (déclaré dans `.claude/settings.json`)
> injecte automatiquement **ce fichier** et `architecture/README.md` en entier.
> La lecture est garantie côté harness — rien à invoquer, aucun `Read` à faire.
>
> **Accusé obligatoire** : la toute première réponse de la session doit commencer
> par la ligne fournie par le hook, seule sur sa ligne :
> `✅ CLAUDE.md lu en entier (N l., 15 règles R1→R15) + architecture/README.md (M l.)`
> Absence de cette ligne = hook non déclenché : le signaler et le réparer.

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

## R4 — Architecture & modularité (OBLIGATOIRE)

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

## R5 — Convention de branches Git (OBLIGATOIRE)

> ⚠️ Cette section parle **exclusivement de branches Git** (`git checkout -b ...`).
> Elle n'a rien à voir avec l'organisation des dossiers/features dans le code.
> Quand on dit "isoler un travail", on parle de **l'isoler sur sa propre branche Git**.

**Règle d'or : tout travail de changement — moyen ou important — doit se faire sur
une NOUVELLE branche Git créée AVANT de toucher au code.** Ne jamais coder
directement sur `main`. Avant la moindre modification non triviale, créer la branche
avec le bon préfixe, puis travailler dessus.

Sont concernés (liste non exhaustive) : nouvelle feature, refacto, ajout/duplication
de composant, modification d'un flux, correction de bug. Seules les retouches
ultra-mineures (typo, commentaire, log) peuvent rester sur la branche courante.

Toujours préfixer les branches selon leur nature :

- `debug/<sujet>` — **investigation/résolution d'un bug précis**. Une branche par
  bug. Ex: `debug/checkout-validation`, `debug/socket-reconnection`.
- `feature/<sujet>` — nouvelle fonctionnalité ou durcissement d'une feature.
  Ex: `feature/payment-integration`, `feature/wallet-panier`.
- `backup/<sujet>` — sauvegarde d'un état (ne pas y travailler).

Règles de création :
- **Tout travail de debug** commence sur une branche `debug/`, créée depuis la
  branche d'où vient le problème (pas depuis `main`).
- **Tout travail de feature / changement moyen ou important** commence sur une
  branche `feature/`, créée depuis `main` (sauf indication contraire).
- Une branche = un sujet. Ne pas mélanger plusieurs travaux sur la même branche.

## R6 — État & Contextes (OBLIGATOIRE)

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

## R7 — Tests & Validation (RECOMMANDÉ)

- Frontend : tester en Expo Go (mobile) ET en dev build (comportement natif FCM/etc.).
- Checkout : valider `validateDelivery()` + `validateStock()` avant envoi API.
- Socket : vérifier la reconnexion (débrancher WiFi, puis reconnecter).
- Notifications : tester en foreground (notification reçue) ET en background (app fermée).

## R8 — Secrets & Configuration

`.env` est gitignoré et ne doit JAMAIS être commité. Ne pas hardcoder de secret
dans le code ; tout passe par `src/api/config.ts` (lecture d'environnement).

Configuration centralisée :
- `apiUrl` (backend REST)
- `socketUrl` (backend Socket.IO)
- `Firebase` (projectId, appId, messagingSenderId)
- `Google Sign-In` (clientId)

## R9 — Documentation

Après toute modif des features/hooks/components, **mettre à jour** :
- `architecture/structure.md` : si la structure de fichiers change
- `architecture/<feature>.md` : si la feature change (hooks, props, flux)
- `architecture/README.md` : index + stack

## R10 — Expo Router & Navigation

- **File-based routing** : `app/` contient la structure de navigation
  - `(auth)/` : pages non authentifiées (login, register, phone)
  - `(tabs)/` : pages authentifiées (home, shop, cart, notifications, profile)
  - `_layout.tsx` : providers globaux (Auth, Order, Notification, Socket)
- **Deep-linking** : `app.json` configure les schémas custom (ex. `yaammoo://order/:id`)

## R11 — Pattern asyncthunks & API Calls

- Utiliser `axios` avec `Config.apiUrl` comme base
- Encapsuler chaque appel API dans un hook (`useCheckout`, `useOrders`, etc.)
- Gérer les erreurs : toast utilisateur + log backend
- Pas de `try-catch` sans gestion d'erreur (toujours afficher un feedback)

## R12 — Push Notifications & Socket.IO

**Hybride** :
- Token Expo (`ExponentPushToken[...]`) en Expo Go → détecté et envoyé à Expo Push API
- Token FCM natif en dev build/production → envoyé à Firebase Cloud Messaging
- Backend dispatcher détecte le format et route automatiquement

**Socket.IO** :
- Connexion au boot (AuthContext)
- Rejoins les rooms au login : `app:<appId>`, `user:<userId>`
- Écoute les événements de paiement : `payment.settled`, `order.status_changed`
- Gère la reconnexion automatiquement

## R13 — Flux de paiement (IMPORTANT)

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

## R14 — Clé API MobileWallet

La clé API pour les paiements yaammoo doit être :
- Configurée dans les variables d'environnement du backend yaammoo
- **Jamais exposée au frontend** (tous les appels `/pay` passent par le backend yaammoo)
- Protégée comme un secret sensible (.env gitignoré)

## R15 — Emojis : statut SEULEMENT (OBLIGATOIRE)

**Aucun emoji décoratif**, nulle part : ni dans le code, ni dans les commentaires,
ni dans la doc, ni dans les logs, ni dans les messages de commit.

INTERDIT (décoratif) : `⭐` `📏` `🚨` `🎉` `🎬` `🎁` `🚀` `🔔` `🛵` `🍽` `🥤` `★` `➕`…
Pour mettre en avant, utiliser du **texte** (`IMPORTANT`, `NOTE`, `OBLIGATOIRE`)
ou le gras Markdown. Une icône d'interface passe par `Ionicons`, jamais par un
caractère emoji.

AUTORISÉ (statut, valeur sémantique) : `⚠️` avertissement · `✅` / `✓` succès ·
`❌` erreur · `✕` fermeture. Ils portent une information lue d'un coup d'œil dans
les logs, les tableaux de doc et les encadrés — on les garde.

> S'applique à l'identique au **backend** (`BACKEND/CLAUDE.md`, R19).
> Un emoji décoratif croisé dans un fichier qu'on touche = le retirer avant de
> clore, même s'il était déjà là. Les emojis de statut, on n'y touche pas.
