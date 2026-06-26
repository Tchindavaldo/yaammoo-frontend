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
    ├── MenuManagePanel.tsx             # Panel gestion des menus (stats + chips filtres Dispo/Indispo + bouton Ajouter ; item calqué sur MerchantOrderCard ; vue ajout inline)
    ├── AddMenuSheet.tsx                # Sheet ajout menu (simple)
    ├── AddMenuSheetMultiStep.tsx       # Formulaire menu (Modal pour modif / inline `embedded` pour création) — 3 étapes
    ├── recap-designs/                  # Designs alternatifs de l'étape récap (switcher)
    │   ├── MenuDraft.types.ts          # Type `MenuDraft` (snapshot du formulaire) + sélecteurs (validPrices, namedItems)
    │   ├── MenuRecap.tsx               # Switcher : pills Aperçu/Blocs/Édito/Synthèse → rend le design choisi
    │   ├── MenuRecapDesign1.tsx        # "Aperçu" — carte client (couverture + tarifs/extras/boissons listés)
    │   ├── MenuRecapDesign2.tsx        # "Blocs" — hero card + blocs bordés par section
    │   ├── MenuRecapDesign3.tsx        # "Édito" — mise en page éditoriale
    │   └── MenuRecapDesign4.tsx        # "Synthèse" — recap bref (bandeau + 4 stat-tuiles + résumés condensés +N)
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

## MenuManagePanel.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MenuManagePanel.tsx`

Panel de gestion des menus (Settings → "Gestion menu", via `MenuManageModal`). Aligné sur
le style `OrderManagePanel` / `MerchantOrderCard`.

**Barre fixe (stats + chips)** — calée sous le header de page (`topOffset`), la liste scrolle dessous :
- 2 stats `{n} plat` : "Menu disponible" / "Menu indisponible".
- Ligne chips en `space-between` : filtres **Disponible** / **Indisponible** à gauche
  (pilotent `view`), bouton **Ajouter** (fond plein orange) à droite.

**Vue (`view`)** : `'available' | 'unavailable' | 'add'`.
- `available` / `unavailable` : `FlatList` filtrée, items espacés de 6 (`ItemSeparatorComponent`).
- `add` : rend `AddMenuSheetMultiStep` en mode `embedded` directement dans la zone liste
  (sous la barre fixe). Reclic sur "Ajouter" = sans effet (déjà `view === 'add'`). Retour
  à la liste après save/fermeture, ou via les chips.

**Item de menu** (`renderMenuCard`) — calque `MerchantOrderCard` :
- Avatar rond (image menu, fallback icône) + pastille statut (vert/orange).
- Prix orange en haut, nom en bas ; badge **stock** (`item.stock`, icône cube) à droite.
- Chips : nb de prix + statut. Action **Modifier** (ouvre le Modal de modification).

**Modal de confirmation** (suppression / toggle dispo) : présent mais **non câblé** —
`openConfirmModal` conservé pour une future réintégration de ces actions « autrement ».

---

## AddMenuSheetMultiStep.tsx

**Chemin** : `yaammoo/src/features/merchant/components/AddMenuSheetMultiStep.tsx`

Formulaire de création/modification d'un menu.

**Deux modes de rendu** (prop `embedded`) :
- `embedded` (création, depuis `MenuManagePanel` vue `add`) : rendu inline (pas de `Modal`),
  header masqué (seule la barre de progression reste), footer dégagé au-dessus de la tab bar.
- défaut (modification, ouvert depuis le crayon d'un item) : `Modal` plein écran classique.

**3 étapes** (`STEPS = ['nameImage', 'details', 'recap']`) :
1. **nameImage** — nom, **3 prix en tabs** (Prix 1/2/3 ; le tab sélectionné pilote un couple
   prix + description sur la même ligne ; description multiligne en édition, tronquée 1 ligne
   sinon), puis photos (optionnelles — obligation désactivée temporairement).
2. **details** — deux **sections empilées** (Extras puis Boissons), calquées sur le design
   des prix :
   - **Ligne label** : libellé + compteur `×N` (texte orange, sans fond) + chips des items
     **validés** dans un `ScrollView` horizontal (ne wrappe jamais, scroll pour voir les
     cachés). Chips plats (texte seul, séparés par `·`) ; couleur du texte passe en orange
     pour l'item en cours d'édition.
   - **Ligne d'édition** : input nom + input prix + bouton **supprimer** (poubelle rouge) +
     bouton **valider** (check, fond orange). Cliquer un chip recharge nom/prix dans la ligne
     d'édition (`editIdx`) ; Valider crée ou met à jour, Supprimer retire l'item édité.
   - États draft par catégorie : `extraDraft`/`extraEditIdx`, `drinkDraft`/`drinkEditIdx`.
     Les items sont enregistrés avec `quantite: "1"` et `status: true` par défaut (le stepper
     quantité / toggle dispo par item de l'ancien design ont été retirés).
   - **Disponibilité du menu** : label "Disponibilité" + 2 boutons côte à côte
     (Disponible/Indisponible, vif au clic).
   - **Stock** : label "Stock disponible" + sur la ligne suivante, chiffres `0..200` (pas de
     10) en `ScrollView` **horizontal** scrollable + stepper `− nb +` resserré à droite.
3. **recap** — délégué au composant **`MenuRecap`** (dossier `recap-designs/`) qui propose un
   **switcher** entre plusieurs rendus du même `MenuDraft` (l'utilisateur choisit celui qu'il
   préfère) : *Aperçu* (carte client), *Blocs* (hero + blocs), *Édito* (éditorial), *Synthèse*
   (recap **bref** : bandeau identité + 4 stat-tuiles + lignes résumées « 3 items +N », sans
   listage exhaustif). Le formulaire construit le `MenuDraft` (nom, prix/desc, extras, drinks,
   availability, stock, images) et le passe en lecture seule. Suivi du bouton "Créer le menu" /
   "Modifier".

   > Pour ajouter un design : créer `MenuRecapDesignN.tsx` (props `{ draft: MenuDraft }`,
   > utiliser `validPrices`/`namedItems`), puis l'enregistrer dans `MenuRecap.tsx` (entrée
   > `VARIANTS` + branche de rendu). Aucune logique de formulaire ne change.

**UX inputs** : focus = bordure orange (`focusedField`), erreur de validation = bordure rouge
(`errorFields`, nettoyée à la saisie) ; tap dans le vide ferme le clavier (`Pressable` +
`keyboardDismissMode`).

**Données** : `extra` / `drink` envoyés au backend portent `name`, `prix`, `quantite`, `status`.
Helper `toItem` pour (re)charger un menu existant.

---

## EditBoutiquePanel.tsx

**Chemin** : `yaammoo/src/features/merchant/components/EditBoutiquePanel.tsx`

Permet au marchand d'éditer :
- Infos boutique (nom, description, image, catégorie, localisation)
- Heures de livraison par créneau (stockées dans le document Firestore boutique, lues par `useCheckout` pour le `CheckoutPeriodOverlay`)

Les heures de livraison configurées ici sont ensuite accessibles dans `menu.deliveryHours` (via propagation lors du chargement du menu enrichi dans `CheckoutSheet`).

**Loader au chargement** : à l'ouverture, le panel fetch les données boutique
(`GET /fastfood/:id`). Pendant la requête (`loadingData`), la zone de formulaire affiche
un `ActivityIndicator` centré (« Chargement de la boutique… ») **au lieu** des inputs —
évite l'affichage de champs vides qui se remplissent ensuite. Les inputs n'apparaissent
qu'une fois les données arrivées.

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
