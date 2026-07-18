# Feature — Bonus & Récompenses (côté client)

## Rôle
Interface **client** de consultation, de suivi d'éligibilité et de réclamation des
bonus proposés par les fastfoods (ou la plateforme yaammoo). Ouverte en plein écran
depuis **Settings → « Bonus et parrainage »**. Chaque page (carte) empile : **panneau
stats** (commandes + montant, jour/sem./mois) · **carte principale** (récompense, chip
de statut, description, progression, Début/Fin/Durée) · **mini-cartes** (Proposés /
Mes reçus / Distribués) · **ligne de réclamation**. Navigation par **carrousel** + une
**carte de pagination** en bas (galerie de mini-cartes à gauche, compteur « Bonus N°x »
+ flèches/dots à droite). Fond de page **blanc pur**. L'éligibilité et les stats se
calculent **en direct** à partir des commandes (`OrderContext`).

### Design unique
`UserBonusModal` ne rend plus qu'un seul design (l'ancien « design 2 / spread ») :
**fond de page blanc pur**, cartes blanches (`BonusCard`) avec **bordure fine**
`rgba(0,0,0,0.04)` + ombre très douce, couleur du bonus en accent. La carte de
pagination du bas est **outlined** (`pagCardOutlined`). Plus de prop `variant`,
plus de fond mesh coloré animé.

> L'ombre montante de la tab bar est **atténuée** pendant l'ouverture de la modale
> (voir `settings.tsx`, effet sur `userBonusVisible`) pour éviter une bande grise.

> **Évolutivité (exigence clé)** : un futur type de bonus créé côté fastfood
> s'affiche automatiquement, sans toucher au code, grâce au **registre de types**
> (`config/bonusRegistry.tsx`, rendu par défaut) et au **moteur d'éligibilité**
> piloté par un critère porté par le bonus lui-même.

---

## Arborescence

```
src/features/bonus/
├── types/
│   └── bonus.types.ts            # Bonus, BonusCriteria, BonusReward, BonusProgress, BonusClaimStatus
├── config/
│   └── bonusRegistry.tsx         # ⭐ Descripteur (icône/couleur/label) par type + FALLBACK par défaut
├── config/
│   └── defaultBonuses.ts         # Bonus de démo (fallback si /bonus/all vide ou en erreur) — USE_DEFAULT_BONUSES
├── hooks/
│   ├── useBonus.ts               # GET /bonus/all + normalizeBonus() + claim (POST /bonus-request) + fallback démo
│   ├── useBonusEligibility.ts    # ⭐ Moteur multi-critères (computeEligibility + hooks) + PAID_STATUSES
│   └── useOrderPeriodStats.ts    # Stats commandes/dépenses jour · semaine · mois (commandes payées)
└── components/
    ├── UserBonusModal.tsx        # Coquille : header + carrousel plein écran + carte de pagination bas (fond blanc pur)
    ├── BonusStatsPanel.tsx       # Panneau haut sans fond : blocs Commandes | Montant (périodes horizontales)
    ├── BonusCarousel.tsx         # Carrousel centré (forwardRef goTo, onIndexChange, peek voisins) — remplit la hauteur
    ├── BonusSparkline.tsx        # Petit graphique sparkline (tendance commandes)
    ├── BonusCard.tsx             # ⭐ Carte bonus (design unique) : carte blanche, bordure fine + ombre douce, couleur du bonus en accent
    ├── BonusProgressBar.tsx      # Barre de progression animée réutilisable
    ├── BonusUsageRing.tsx        # Anneau de progression `used/limit` (utilisations du code)
    └── BonusStates.tsx           # BonusSkeleton + BonusEmptyState
```

> **Commande « payée »** = statut `pending`/`finished`/`delivering`/`delivered`
> (constante `PAID_STATUSES`). Sert à la fois au moteur d'éligibilité et aux stats de période.

Point d'entrée monté dans [`app/(tabs)/settings.tsx`](../app/(tabs)/settings.tsx)
(`<UserBonusModal>`, état `userBonusVisible`). Pattern identique aux panneaux
« Mes activités » (`UserOrdersModal`, `UserWalletModal`) : **View absolue** (pas de
`<Modal>` natif) + `TabHeader` + `HeaderPill` « Retour ».

---

## Modèle de données (frontend)

Le backend stocke un bonus en forme libre (`{ id, ...data, createdAt }`).
`normalizeBonus()` le convertit vers la forme canonique et tolère les formes
héritées (`order_count`, `type: *_bonus`, `minOrderAmount`…) :

```ts
Bonus {
  id, type,                // type = chaîne libre : 'netflix' | 'free_delivery' | 'free_meal' | 'discount' | <futur>
  name, description,
  reward: { value?, unit?, label? },
  criteria: { kind, target?, fastFoodId? },
  isFastFoodBonus?, fastFoodName?, validUntil?, createdAt?,
  // Stats affichées sur la carte (fournies par le backend) :
  fastFoodBonusCount?,   // bonus proposés par le fastfood
  userClaimedCount?,     // fois où CE user a pris ce bonus
  totalClaimedCount?,    // fois où TOUS les users l'ont pris
  requestStatus?         // 'none' | 'pending' | 'approved' (validation fastfood)
}
```

**Rendu (design) :** fond de page **blanc pur**. Cartes blanches (bordure fine
`rgba(0,0,0,0.04)` + ombre très douce), couleur du bonus en accent. Carte de
pagination outlined en bas, au-dessus de la navbar (galerie à slider + compteur
« Bonus N°x » + flèches/dots).

### Critères d'éligibilité (`BonusCriteria.kind`)
| kind | Mesure | Éligible quand |
|---|---|---|
| `welcome` | — | toujours |
| `order_count` | nb de commandes payées | `current >= target` |
| `amount_spent` | montant cumulé payé (FCFA) | `current >= target` |

> **Pas d'expiration de bonus.** Un bonus ne s'affiche jamais « expiré ». La seule
> échéance est celle du **code après réclamation** (`claimedAt + claimDuration`) :
> une fois passée, les compteurs se réinitialisent avec le statut et le bonus
> repasse simplement « non éligible ». Le moteur ne connaît donc plus ni
> `validUntil` ni `expired`.

`fastFoodId` optionnel restreint la mesure aux commandes d'une boutique (fidélité ciblée).
**Ajouter un critère** = une valeur dans `BonusCriteriaKind` + un `case` dans
`computeEligibility` ; l'UI ne bouge pas.

---

## Moteur d'éligibilité — `useBonusEligibility.ts`

- **Commande « payée »** = statut `pending`, `finished`, `delivering` ou `delivered`
  (constante `PAID_STATUSES`). Le panier (`pendingToBuy`) et les annulations ne comptent pas.
- `computeEligibility(bonus, orders)` (pur, testable) → `BonusProgress`
  `{ measurable, eligible, current, target, remaining, progress, unit }`.
  Critère inconnu → `measurable:false` (bonus affiché mais non mesuré → consultation).
- Hooks : `useBonusEligibility(bonus)` (une carte) et `useBonusEligibilityMap(bonuses)` (roadmap).
  Recalcul automatique à chaque évolution des commandes (socket inclus).

---

## Registre de types — `bonusRegistry.tsx`

`getBonusDescriptor(type)` renvoie `{ icon, color, gradient, label }` — un descripteur
dédié pour les types connus, sinon `DEFAULT_DESCRIPTOR` (icône cadeau, couleur primaire).
`getPresentBonusTypes(bonuses)` alimente les chips de filtre.

| Type | Icône | Couleur |
|---|---|---|
| `netflix` | play-circle | `#E50914` |
| `free_delivery` | bicycle | `#2563eb` |
| `free_meal` | fast-food | `#f59e0b` |
| `discount` | pricetag | `#16a34a` |
| *(inconnu)* | gift | primaire |

---

## Réclamation (claim)

`useBonus().claimBonus(bonus)` → `POST /bonus-request`
`{ userId, bonusId, bonusType, status: ['pending'] }`. Optimiste : le statut local
(`claims[bonusId]`) passe à `pending` au succès → la carte affiche « Demande envoyée ».
Feedback via `Toast` (succès/erreur).

## API consommée
| Méthode | Endpoint | Usage |
|---|---|---|
| GET | `/bonus/all` | Liste des bonus |
| POST | `/bonus-request` | Réclamer un bonus |

## Deep-link
Notification `type: "bonus"` → `/(tabs)/settings?section=bonus` → ouvre `UserBonusModal`
(voir `notificationRouting.ts` + le `useEffect` sur `section` dans `settings.tsx`).

## À venir (non implémenté)
- Parrainage (code à partager, suivi des filleuls) — l'item Settings s'appelle déjà « Bonus **et parrainage** ».
- Onglet Historique (demandes approuvées/utilisées/expirées) via `GET /bonus-request/:userId`.
- Pastille « N éligibles » sur l'item Settings.
