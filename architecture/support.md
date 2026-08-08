# Feature — Support / Contactez-nous (client)

## Rôle
Chat entre le client et l'équipe yaammoo, ouvert depuis **Settings → « Contactez-nous »**.
**Branché au backend** : fils, messages, envoi et temps réel passent par
`/support` (voir `BACKEND/architecture/support.md`).

## Structure

```
src/features/support/
├── components/
│   ├── SupportChatSheet.tsx     # Écran plein écran (View absolue + TabHeader) : liste <-> conversation
│   ├── SupportChatView.tsx      # Conversation : chips + messages + saisie
│   ├── SupportTopicChips.tsx    # Chips « objet de la discussion »
│   ├── SupportMessageBubble.tsx # Bulle message (user à droite / support à gauche)
│   ├── SupportThreadRow.tsx     # Ligne de la liste des discussions
│   ├── SupportThreadsSkeleton.tsx # Squelette de la liste pendant le chargement
│   ├── SupportMessagesSkeleton.tsx # Squelette des bulles pendant le GET messages
│   └── SupportComposer.tsx      # Barre de saisie + bouton envoyer
├── hooks/
│   ├── useKeyboardOffset.ts     # Décalage de la saisie (ouverture animée courte, fermeture instantanée)
│   ├── useSupportThreads.ts     # Liste des fils + socket `support.message`
│   └── useSupportConversation.ts# Messages d'un fil, envoi, socket
├── services/supportService.ts   # Appels HTTP `/support`
├── data/support.constants.ts    # SUPPORT_TOPICS, statuts, helpers de nom
└── types/support.types.ts       # SupportThread, SupportMessage, SupportTopic
```

## Rendu
Écran **plein écran** calqué sur `DriverApplyModal` : `View` en overlay absolu,
`TabHeader` (blur au-dessus du settings) avec `HeaderPill` « Retour » — pas de
bottom sheet à mi-hauteur.

## Flux UI

1. **Liste** — discussions passées. Le **titre** de chaque ligne est
   l'interlocuteur : le **nom du fastfood** (`thread.fastFood.nom`) ou
   **« yaammoo »** quand `fastFood` vaut `null` (helper `getThreadName`),
   précédé d'un **chip d'objet** (Question, Problème…). Deux lignes seulement :
   objet + nom + date, puis dernier message + badge non-lus — ni résumé ni
   statut. Bouton bas fixe **« Nouveau chat »**.
   Pendant le chargement HTTP, la liste affiche `SupportThreadsSkeleton` :
   un **spinner centré** (`ActivityIndicator size="large"`) sur toute la zone.
   Il est rendu **hors `ScrollView`** — un `flex: 1` ne s'étire pas dans un
   `contentContainer` et le spinner ne serait pas centré ; le titre de section
   est masqué pour la même raison.
   Il s'affiche **dès que `loading` est vrai**, y compris quand des fils sont
   déjà en mémoire d'une ouverture précédente : sinon la liste montrerait des
   données périmées sans aucun signe que ça recharge. `loading` démarre à
   `true` dans `useSupportThreads`, sinon l'état vide clignoterait avant le
   spinner. Le header affiche « Chargement… » en parallèle.
2. **Nouveau chat** — la saisie est affichée d'emblée mais **bloquée**, avec les
   **chips d'objet** juste au-dessus (Question, Problème, Assistance,
   Suggestion, Discussion). Un tap sur la saisie affiche le toast
   « Vous devez d'abord sélectionner un objet ».
3. **Après sélection** — la saisie s'active et l'objet apparaît dans le
   **sous-titre du header** (l'objet SEUL, sans statut). Les chips **restent
   affichées** tant qu'aucun message n'est parti (l'objet reste corrigeable) et
   disparaissent au **premier message envoyé**. Le **titre du header** est
   l'interlocuteur (nom du fastfood ou « yaammoo »).
4. **Discussion existante** — même rendu : le header porte le nom de
   l'interlocuteur et, sous le titre, l'objet du fil ; la conversation s'ouvre
   directement. Tant que le `GET .../messages` tourne, la vue affiche
   **uniquement** `SupportMessagesSkeleton` : ni texte d'accueil, ni chips, ni
   saisie, qui clignoteraient avant les messages. Il **réutilise
   `SupportThreadsSkeleton`** (même spinner centré) — un motif unique pour
   toute la feature.
   Le sous-titre du header prend l'objet **du fil** (`chatTopic ?? thread.topic`)
   — `chatTopic` n'est remonté qu'après le rendu de la vue chat, l'invite
   « Choisissez l'objet… » apparaîtrait sinon une fraction de seconde.

### Clavier
Le décalage de la saisie passe par `useKeyboardOffset`, piloté par
`keyboardWillShow` (iOS) / `keyboardDidShow` (Android). L'ouverture est animée
sur **140 ms** ; la **fermeture est instantanée**, sinon la saisie traîne
derrière le clavier qui descend : la saisie suit le mouvement du clavier système, sans transition
propre qui traînerait derrière. iOS absorbe la hauteur du clavier ; Android est
déjà en `adjustResize` (AndroidManifest), il ne reste qu'une marge.
Ne pas ajouter de `KeyboardAvoidingView` par-dessus — les deux se cumuleraient.

> Le pendant **marchand** (Settings → Boutique → Messages) est une feature
> **entièrement séparée** : voir [support-merchant.md](./support-merchant.md).
> Aucun composant n'est partagé entre les deux.

## Endpoints utilisés

| Besoin | Endpoint |
|---|---|
| Liste des fils | `GET /support/threads?userId=` |
| Messages d'un fil | `GET /support/threads/:id/messages` |
| Création d'un fil | `POST /support/threads` (`topic`, `text`, `fastFoodId?`) |
| Envoi de message | `POST /support/threads/:id/messages` |
| Marquer lu | `PATCH /support/threads/:id/read` |
| Temps réel | socket `support.message` sur la room `<userId>` |

`fastFoodId` absent ou `null` = demande adressée à la plateforme yaammoo.

Le premier message d'un nouveau chat **crée** le fil (`POST /support/threads`) ;
les suivants passent par la route messages. Ouvrir un fil vaut lecture
(`PATCH .../read`). Les messages reçus en socket sont dédupliqués par `id`,
l'envoi HTTP renvoyant déjà le message créé.
