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
│   ├── MerchantSupportThreadsSkeleton.tsx # Squelette de la liste au chargement
│   ├── MerchantSupportMessagesSkeleton.tsx # Squelette des bulles au GET messages
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

## Chargement

La liste affiche `MerchantSupportThreadsSkeleton` **dès que `loading` est vrai**,
y compris quand des fils sont déjà en mémoire d'une ouverture précédente : sinon
elle montrerait des données périmées sans signe de rechargement. C'est un
**spinner centré** (`ActivityIndicator size="large"`) sur toute la zone, rendu
**hors `ScrollView`** — un `flex: 1` ne s'étire pas dans un `contentContainer`
et le spinner ne serait pas centré ; le titre de section est masqué de même.
`loading` démarre à `true` dans `useMerchantSupportThreads`, sinon l'état vide
clignoterait avant le spinner. Composant **propre à la feature marchande**,
aucun partage avec celui du client.

À l'ouverture d'un fil, tant que le `GET .../messages` tourne, la conversation
affiche **uniquement** `MerchantSupportMessagesSkeleton` : ni texte d'accueil,
ni barre de réponse. Il **réutilise `MerchantSupportThreadsSkeleton`** (même
spinner centré) — un motif unique pour toute la feature.

Dans les deux cas le header affiche « Chargement… » en sous-titre pendant la
requête.

## Endpoints utilisés

| Besoin | Endpoint |
|---|---|
| Fils reçus par la boutique | `GET /support/threads?fastFoodId=` |
| Messages d'un fil | `GET /support/threads/:id/messages` |
| Répondre | `POST /support/threads/:id/messages` avec `author: 'support'` |
| Marquer lu | `PATCH /support/threads/:id/read?side=support` |
| Temps réel | socket `support.message` sur la room `<fastFoodId>` |
