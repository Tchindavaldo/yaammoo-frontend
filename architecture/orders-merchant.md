# Feature — Orders (côté marchand)

## Rôle
Interface marchand pour gérer les commandes reçues : visualisation par statut et par date, tri par rank, lancement de livraisons groupées.

---

## Arborescence des fichiers

```
yaammoo/src/features/merchant/
├── context/
│   └── MerchantContext.tsx            # Provider marchand (boutique, commandes, menus)
├── hooks/
│   └── useMerchant.ts                 # Hook d'accès au contexte marchand
├── services/
│   └── merchantService.ts             # Appels API marchand
└── components/
    ├── OrderManagePanel.tsx            # Panel principal gestion commandes
    ├── MerchantOrderCard.tsx           # Carte commande côté marchand (avec bouton avancer statut)
    ├── MerchantOrderBottomSheet.tsx    # Bottom sheet détail commande marchand (mobile)
    ├── MerchantOrderBottomSheet.web.tsx # Version web du bottom sheet
    ├── MenuManagePanel.tsx             # Panel gestion des menus
    ├── AddMenuSheet.tsx                # Sheet ajout menu (simple)
    ├── AddMenuSheetMultiStep.tsx       # Sheet ajout menu multi-étapes
    ├── EditBoutiquePanel.tsx           # Panel édition infos boutique + heures livraison
    ├── PorteFeuillePanel.tsx           # Panel portefeuille / transactions
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

**Onglets statut** :
| Key | Label | Statuts Firestore |
|---|---|---|
| `pending` | En Attente | `pending` |
| `proccess` | En cours | `processing`, `active`, `in_progress` |
| `finish` | Terminées | `completed`, `finished`, `done`, `delivering` |

**Filtre par date** : chips horizontaux (Aujourd'hui, Demain, dates suivantes) basés sur `delivery.date` ou `createdAt`.

**Tri par rank** :
- Onglets `pending` et `proccess` : `dateFilteredOrders` triés par `rank ASC` via `useMemo`
- Commandes sans rank → en dernier (`Infinity`)

**Layout "Terminées"** (onglet `finish`) :
- Groupement par type de livraison : Express (groupe unique) + Scheduled (groupes par créneau horaire)
- Chaque groupe : header collapsible + bouton "Lancer tout" (déclenche `onUpdateStatus` avec `delivering`)
- Les commandes du même utilisateur dans un groupe sont affichées via un seul `MerchantOrderCard` avec `allOrders`

**Layout "En Attente" / "En cours"** :
- `FlatList` simple avec `MerchantOrderCard` pour chaque commande

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

## Règles métier marchand

- Un marchand ne peut avoir qu'une seule boutique (document `fastfoods` lié à son `userId`)
- Les commandes reçues arrivent via socket `newFastFoodOrders` (statut `pending`)
- Avancer une commande : appel `PUT /order/tabs/:userId` ou via `MerchantContext`
- Lancer une livraison : passe au statut `delivering` → émet `newPeriodKeyDelivering` / `newClientIdDelivering` aux clients concernés
