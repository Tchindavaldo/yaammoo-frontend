# Feature — Orders (côté marchand)

## Rôle
Interface marchand pour gérer les commandes reçues : visualisation par statut et par date, tri par rank, lancement de livraisons groupées.

---

## Arborescence des fichiers

```
yaammoo/src/features/merchant/
├── context/
│   ├── MerchantContext.tsx            # Provider marchand (boutique, commandes, menus)
│   └── MerchantWalletContext.tsx      # Provider stats portefeuille + handlers socket retrait
├── hooks/
│   ├── useMerchant.ts                 # Hook d'accès au contexte marchand
│   └── useWithdraw.ts                 # Hook logique retrait (states, POST, verdict socket)
├── services/
│   ├── merchantService.ts             # Appels API marchand
│   └── withdrawService.ts             # Appel POST /wallet/withdraw
└── components/
    ├── OrderManagePanel.tsx            # Panel principal gestion commandes
    ├── MerchantOrderCard.tsx           # Carte commande côté marchand (avec bouton avancer statut)
    ├── MerchantOrderBottomSheet.tsx    # Bottom sheet détail commande marchand (mobile)
    ├── MerchantOrderBottomSheet.web.tsx # Version web du bottom sheet
    ├── MenuManagePanel.tsx             # Panel gestion des menus
    ├── AddMenuSheet.tsx                # Sheet ajout menu (simple)
    ├── AddMenuSheetMultiStep.tsx       # Sheet ajout menu multi-étapes
    ├── EditBoutiquePanel.tsx           # Overlay plein écran édition boutique (Settings → "Gérer ma boutique")
    ├── MenuManageModal.tsx             # Overlay plein écran gestion menus (Settings → "Gestion menu")
    ├── WalletManageModal.tsx           # Overlay plein écran portefeuille (Settings → "Portefeuille")
    ├── PorteFeuillePanel.tsx           # Panel portefeuille (barre fixe Solde+Retrait, historique jours)
    ├── WithdrawOverlay.tsx             # Overlay retrait (saisie montant → réseau → numéro → verdict)
    ├── WalletDayStatItem.tsx           # Ligne d'une journée dans l'historique portefeuille
    ├── NoBoutiquePanel.tsx             # Écran si pas encore de boutique créée
    ├── BikeAnimation.tsx               # Animation vélo (livraison en cours)
    └── TransactionItem.tsx             # Ligne d'une transaction
```

---

## OrderManagePanel.tsx

**Chemin** : `yaammoo/src/features/merchant/components/OrderManagePanel.tsx`

**Props** :
| Prop | Type | Description |
|---|---|---|
| `orders` | `Commande[]` | Toutes les commandes de la boutique |
| `loading` | boolean | Refresh en cours |
| `onRefresh` | `() => void` | Callback pull-to-refresh |
| `onUpdateStatus` | `(id, status) => Promise<void\|boolean>` | Avance le statut d'une commande |
| `selectedDate` | `string \| null` | Date sélectionnée (contrôlée par le header de page) |
| `onSelectDate` | `(iso: string \| null) => void` | Remonte le choix de date au header |
| `onDatesChange` | `(opts: DateOption[]) => void` | Remonte la liste des dates disponibles au header (DatePill) |

**Onglets statut** :
| Key | Label | Statuts Firestore |
|---|---|---|
| `pending` | En Attente | `pending` |
| `proccess` | En cours | `processing`, `active`, `in_progress` |
| `finish` | Terminées | `completed`, `finished`, `done`, `delivering` |

**Filtre par date** : les dates disponibles (basées sur `delivery.date` ou `createdAt`) sont
calculées par le panel puis **remontées au header de page** via `onDatesChange` ; la sélection
est affichée dans le `DatePill` du `TabHeader` (boutique.tsx) et redescend via `selectedDate`.
Le panel ne rend plus sa propre ligne de chips date. Pour éviter une boucle de rendu, l'effet
qui remonte les dates dépend d'une clé stable `datesKey = sortedDateISOs.join(",")`.

**Tri par rank** :
- Onglets `pending` et `proccess` : `dateFilteredOrders` triés par `rank ASC` via `useMemo`
- Commandes sans rank → en dernier (`Infinity`)

**Layout "Terminées"** (onglet `finish`) :
- Groupement par type de livraison : Express (groupe unique) + Scheduled (groupes par créneau horaire)
- Chaque groupe : header collapsible + bouton "Lancer tout" (déclenche `onUpdateStatus` avec `delivering`)
- Les commandes du même utilisateur dans un groupe sont affichées via un seul `MerchantOrderCard` avec `allOrders`

**Layout "En Attente" / "En cours"** :
- `FlatList` simple avec `MerchantOrderCard` pour chaque commande

**Barre fixe + scroll-under + snap** :
- La barre stats+chips est en `position: absolute` (`top: topOffset`, mesurée via
  `onLayout` → `barHeight`) ; la liste scrolle dessous (`paddingTop = topOffset + barHeight + 15`).
- **Snap après-coup** : à `onMomentumScrollEnd`, si une carte est coupée au bord bas
  de la barre fixe, on `scrollTo` la carte la plus proche (haut ou bas). Repose sur
  une hauteur de carte fixe `MERCHANT_CARD_HEIGHT` (≈94.33, exportée par MerchantOrderCard)
  + gap de 6. `paddingBottom = insets.bottom + tab bar + 24` pour que le dernier item
  reste visible (au-dessus de la navbar).

---

## MerchantOrderCard.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MerchantOrderCard.tsx`

**Props** :
| Prop | Type | Description |
|---|---|---|
| `order` | `Commande` | Commande principale à afficher |
| `allOrders` | `Commande[]` | Toutes les commandes du groupe (optionnel, pour livraisons groupées) |
| `isForceLaunched` | boolean | État lancé forcé (depuis "Lancer tout") |
| `onUpdateStatus` | `(status) => Promise<void>` | Callback avancement statut |

**Bouton d'action** : avance le statut selon la transition backend (pas de statut cible envoyé explicitement — le backend détermine le suivant).

---

## EditBoutiquePanel.tsx

**Chemin** : `yaammoo/src/features/merchant/components/EditBoutiquePanel.tsx`

Permet au marchand d'éditer :
- Infos boutique (nom, description, image, catégorie, localisation)
- Heures de livraison par créneau (stockées dans le document Firestore boutique, lues par `useCheckout` pour le `CheckoutPeriodOverlay`)

Les heures de livraison configurées ici sont ensuite accessibles dans `menu.deliveryHours` (via propagation lors du chargement du menu enrichi dans `CheckoutSheet`).

---

## PorteFeuillePanel.tsx

**Chemin** : `yaammoo/src/features/merchant/components/PorteFeuillePanel.tsx`

Affiche le solde global du marchand et l'historique par journée. Déclenche le flux de retrait via `useWithdraw`.

**Source de données** : `MerchantWalletContext` (stats patchées en temps réel par les événements socket `wallet.withdrawal`).

**Flux retrait** (déclenché par le bouton "Retirer") :
1. `withdrawState` passe de `idle` → `amount_input` → `network_select` → `input`
2. POST `withdrawService.withdraw()` → passage en `waiting` puis `processing` dès la réponse HTTP
3. Verdict socket `wallet.withdrawal` → `completed` (fermeture auto + refresh stats après 5 s) ou `failed` (toast erreur)

---

## useWithdraw.ts

**Chemin** : `yaammoo/src/features/merchant/hooks/useWithdraw.ts`

Gère l'ensemble de la logique retrait (états, appel API, verdict socket).

**États `WithdrawState`** :
| État | Description |
|---|---|
| `idle` | Overlay fermé |
| `amount_input` | Saisie du montant |
| `network_select` | Choix du réseau (Orange / MTN) |
| `input` | Saisie du numéro de téléphone |
| `waiting` | Requête en vol — "Veuillez patienter…" |
| `processing` | Réponse HTTP reçue (withdrawalId connu) — "Retrait en cours…" |
| `completed` | Socket `completed` reçu — "Retrait effectué !" (fermeture auto 5 s) |
| `failed` | Erreur HTTP ou socket `failed` |

**`DEBUG_COMPLETED`** : constante exportée à `false` en production. Passer à `true` temporairement pour afficher l'overlay directement en état `completed` sans déclencher un vrai retrait.

---

## MerchantWalletContext.tsx

**Chemin** : `yaammoo/src/features/merchant/context/MerchantWalletContext.tsx`

Provider qui expose :
- `stats` : solde + séries journalières (chargées via `walletStatsService`)
- `loading` / `refresh` : pull-to-refresh
- `registerWithdrawalHandler` / `unregisterWithdrawalHandler` : bus interne pour que `useWithdraw` reçoive les événements socket `wallet.withdrawal`

---

## Règles métier marchand

- Un marchand ne peut avoir qu'une seule boutique (document `fastfoods` lié à son `userId`)
- Les commandes reçues arrivent via socket `newFastFoodOrders` (statut `pending`)
- Avancer une commande : appel `PUT /order/tabs/:userId` ou via `MerchantContext`
- Lancer une livraison : passe au statut `delivering` → émet `newPeriodKeyDelivering` / `newClientIdDelivering` aux clients concernés
