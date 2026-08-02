# Feature — Messages boutique (côté marchand)

Discussions ouvertes par les clients **envers une boutique**, consultées depuis
**Settings → Boutique → « Messages »**. **Branché au backend** via `/support`
(mêmes endpoints que le chat client, lus du point de vue de la boutique).

> **Feature entièrement séparée** du chat client (`src/features/support/`) :
> aucun composant, type ou hook partagé entre les deux. Une évolution d'un côté
> n'impacte jamais l'autre.

## Structure

```
src/features/merchant/
├── components/support/
│   ├── MerchantSupportModal.tsx      # Écran plein écran : liste <-> conversation
│   ├── MerchantSupportChatView.tsx   # Conversation + saisie
│   ├── MerchantSupportBubble.tsx     # Bulle (boutique à droite, client à gauche)
│   ├── MerchantSupportThreadRow.tsx  # Ligne de la liste
│   └── MerchantSupportComposer.tsx   # Barre de réponse
├── hooks/
│   ├── useMerchantKeyboardOffset.ts
│   ├── useMerchantSupportThreads.ts       # Fils de la boutique + socket
│   └── useMerchantSupportConversation.ts  # Messages d'un fil, réponse, socket
├── services/merchantSupportService.ts     # Appels HTTP `/support` cote boutique
├── data/merchantSupport.constants.ts
└── types/merchantSupport.types.ts
```

## Différences avec le chat client

| | Client (`features/support`) | Marchand (ici) |
|---|---|---|
| Créer un fil | Oui, bouton « Nouveau chat » | **Non** — la boutique répond seulement |
| Chips d'objet | Choisis à la création | **Aucun** : l'objet vient du client, rappelé dans le header |
| Titre de la liste | Nom du fastfood ou « yaammoo » | **Nom du client** |
| Bulle en accent | Messages du client | Messages de la **boutique** (`author: 'support'`) |
| Compteur non-lus | `unreadCount` | `supportUnreadCount` du backend |

## Endpoints utilisés

| Besoin | Endpoint |
|---|---|
| Fils reçus par la boutique | `GET /support/threads?fastFoodId=` |
| Messages d'un fil | `GET /support/threads/:id/messages` |
| Répondre | `POST /support/threads/:id/messages` avec `author: 'support'` |
| Marquer lu | `PATCH /support/threads/:id/read?side=support` |
| Temps réel | socket `support.message` sur la room `<fastFoodId>` |
