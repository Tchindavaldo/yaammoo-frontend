# Feature — Support / Contactez-nous (client)

## Rôle
Chat entre le client et l'équipe yaammoo, ouvert depuis **Settings → « Contactez-nous »**.
État actuel : **design seulement**, alimenté par des données de démonstration
(`data/support.mock.ts`). Aucun appel réseau — les endpoints backend restent à brancher.

## Structure

```
src/features/support/
├── components/
│   ├── SupportChatSheet.tsx     # Écran plein écran (View absolue + TabHeader) : liste <-> conversation
│   ├── SupportChatView.tsx      # Conversation : chips + messages + saisie
│   ├── SupportTopicChips.tsx    # Chips « objet de la discussion »
│   ├── SupportMessageBubble.tsx # Bulle message (user à droite / support à gauche)
│   ├── SupportThreadRow.tsx     # Ligne de la liste des discussions
│   └── SupportComposer.tsx      # Barre de saisie + bouton envoyer
├── hooks/useKeyboardOffset.ts   # Décalage de la saisie (ouverture animée courte, fermeture instantanée)
├── data/support.mock.ts         # SUPPORT_TOPICS + threads de démonstration
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
2. **Nouveau chat** — écran d'accueil **centré** (titre + description) avec les
   **chips d'objet** en bas (Question, Problème, Assistance, Suggestion,
   Discussion). **Aucune saisie** tant qu'aucun objet n'est choisi.
3. **Après sélection** — les chips disparaissent, l'objet est repris dans le
   **sous-titre du header** (`Objet · statut`), et la saisie apparaît. Le
   **titre du header** est l'interlocuteur (nom du fastfood ou « yaammoo »).
4. **Discussion existante** — même rendu : l'objet et le statut du fil sont
   affichés dans le header, la conversation s'ouvre directement.

### Clavier
Le décalage de la saisie passe par `useKeyboardOffset`, piloté par
`keyboardWillShow` (iOS) / `keyboardDidShow` (Android). L'ouverture est animée
sur **140 ms** ; la **fermeture est instantanée**, sinon la saisie traîne
derrière le clavier qui descend : la saisie suit le mouvement du clavier système, sans transition
propre qui traînerait derrière. iOS absorbe la hauteur du clavier ; Android est
déjà en `adjustResize` (AndroidManifest), il ne reste qu'une marge.
Ne pas ajouter de `KeyboardAvoidingView` par-dessus — les deux se cumuleraient.

## À brancher (backend)

| Besoin | Attendu |
|---|---|
| Liste des fils | `GET` threads du user |
| Messages d'un fil | `GET` messages par thread |
| Création d'un fil | `POST` avec `topic` + 1er message |
| Envoi de message | `POST` message dans un thread |
| Temps réel | événement socket sur nouveau message support |
