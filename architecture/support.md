# Feature — Support / Contactez-nous (client)

## Rôle
Chat entre le client et l'équipe yaammoo, ouvert depuis **Settings → « Contactez-nous »**.
État actuel : **design seulement**, alimenté par des données de démonstration
(`data/support.mock.ts`). Aucun appel réseau — les endpoints backend restent à brancher.

## Structure

```
src/features/support/
├── components/
│   ├── SupportChatSheet.tsx     # Sheet conteneur : liste <-> conversation
│   ├── SupportChatView.tsx      # Conversation : chips + messages + saisie
│   ├── SupportTopicChips.tsx    # Chips « objet de la discussion »
│   ├── SupportMessageBubble.tsx # Bulle message (user à droite / support à gauche)
│   ├── SupportThreadRow.tsx     # Ligne de la liste des discussions
│   └── SupportComposer.tsx      # Barre de saisie + bouton envoyer
├── data/support.mock.ts         # SUPPORT_TOPICS + threads de démonstration
└── types/support.types.ts       # SupportThread, SupportMessage, SupportTopic
```

## Flux UI

1. **Liste** — discussions passées (icône du sujet, titre, dernier message, date,
   badge non-lus, statut). Bouton bas fixe **« Nouveau chat »**.
2. **Nouveau chat** — conversation vierge ; en haut, les **chips d'objet**
   (Question, Problème, Assistance, Suggestion, Discussion). Tant qu'aucun objet
   n'est choisi, la saisie est désactivée.
3. **Discussion existante** — les chips passent en lecture seule et n'affichent
   que le sujet du fil.

## À brancher (backend)

| Besoin | Attendu |
|---|---|
| Liste des fils | `GET` threads du user |
| Messages d'un fil | `GET` messages par thread |
| Création d'un fil | `POST` avec `topic` + 1er message |
| Envoi de message | `POST` message dans un thread |
| Temps réel | événement socket sur nouveau message support |
