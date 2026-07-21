# Feature — Bonus & Récompenses (côté client)

## Rôle
Interface **client** de consultation, de suivi d'éligibilité et de réclamation des
bonus proposés par les fastfoods (ou la plateforme yaammoo). Ouverte en **bottom
sheet** depuis **Settings → « Bonus et parrainage »**. L'éligibilité et les stats se
calculent **en direct** à partir des commandes (`OrderContext`).

### Design courant — bottom sheet
`UserBonusSheet` présente la feature en **bottom sheet de hauteur fixe**
(`SHEET_HEIGHT = 400`), réduite à l'essentiel :

1. **Carte principale** du bonus courant (`BonusCard` dans le carrousel) —
   récompense, chip de statut, description, progression, Début/Fin/Durée ;
2. **Carte de pagination** du bas, intégrale, qui porte les **deux** lignes :
   la ligne de réclamation (`BonusClaimRow`) **et** la ligne de pagination
   (galerie de mini-cartes à gauche + panneau « héro » à droite).

Cartes blanches (`BonusCard`) : **bordure fine** + ombre très douce, couleur du
bonus en accent. Navigation au **swipe** du carrousel ou au **tap** sur une
mini-carte. Pas de prop `variant`, pas de fond mesh coloré animé.

> **Retirés par rapport à l'ancien design plein écran** : le **panneau stats** du
> haut (`BonusStatsPanel`, commandes + montant par jour/sem./mois) et la ligne de
> **mini-cartes** (Proposés / Mes reçus / Distribués). Le hook
> `useOrderPeriodStats` reste présent (consommé ailleurs / réserve).

### Ancien design — `src/features/bonus-v2/`
L'ancien design **plein écran** (`UserBonusV2Modal`, fond blanc pur, panneau stats
+ mini-cartes) est conservé sous `src/features/bonus-v2/`, accessible via
**Settings → « Bonus V2 »**, pour comparaison visuelle. Feature **100 %
indépendante** : son propre contexte (`BonusV2Provider`), ses propres hooks
(`useBonusV2*`), aucun import partagé avec `bonus/`. À supprimer une fois le
design tranché.

> L'ombre montante de la tab bar est **atténuée** pendant l'ouverture
> (voir `settings.tsx`, effet sur `userBonusVisible`) pour éviter une bande grise.

### Alignement sur le header
Le `TabHeader` pose son texte à `Theme.spacing.md` (16 px) du bord. Les cartes
s'alignent sur **le texte** : chaque bloc porte une marge `GUTTER − son padding
interne`, si bien que `marge + padding = 16` et que les libellés tombent sur la
même verticale que « Bonus » dans le header.

Les paddings sont volontairement **proches** (10 à 12) pour que les marges qui en
découlent le soient aussi (+4 à +6) : les bordures forment ainsi une colonne
régulière. ⚠️ Un padding nettement plus grand (ex. 18) produirait une marge
négative et une carte qui déborde visiblement des autres — c'est ce qu'il faut
éviter en touchant ces constantes.

| Bloc | Constante | Padding | Marge |
|---|---|---|---|
| Carte principale | `CARD_PAD` | 10 | +6 |
| Ligne réclamation | `CLAIM_PAD` | 12 | +4 |
| Pagination | `PAG_PAD` | 10 | +6 |

### Pull-to-refresh
`UserBonusSheet` englobe le carrousel dans un `ScrollView` **vertical**
(`refreshControl={pullControl}`) : le carrousel étant horizontal, il ne peut pas
capter le geste lui-même. Le rechargement est **silencieux** (`refresh(true)`) pour
éviter le skeleton plein écran, et l'état local `refreshing` pilote le spinner.
Les états **vide** et **erreur** sont eux aussi tirables.

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
│   ├── useBonusStatus.ts         # Statut affichable (libellé + couleur + drapeaux) — partagé ClaimRow/PagerInfo
│   └── useOrderPeriodStats.ts    # Stats commandes/dépenses jour · semaine · mois (commandes payées)
└── components/
    ├── UserBonusSheet.tsx        # ⭐ Coquille : BOTTOM SHEET (hauteur fixe 400) — carrousel + carte de pagination bas
    ├── BonusCarousel.tsx         # Carrousel centré (forwardRef goTo, onIndexChange, peek voisins) — remplit la hauteur
    ├── BonusPagerInfo.tsx        # Colonne droite pagination — panneau « héro » : n° géant en filigrane, icône+émetteur+reste, nom, statut, jauge de position
    ├── BonusGalleryCard.tsx      # Mini-carte de la galerie de pagination : fond + barre de progression interpolés sur scrollX (sans bordure)
    ├── gallery.constants.ts      # Dimensions de la galerie (largeur/gap/pas/radius)
    ├── BonusClaimRow.tsx         # Ligne de réclamation du bonus courant (statut + boutons Réclamer / Profil / Compte)
    ├── BonusCredentialsSheet.tsx # Bottom sheet des identifiants livrés (profil, code, email, mot de passe — copiables)
    ├── BonusSparkline.tsx        # Petit graphique sparkline (tendance commandes)
    ├── BonusCard.tsx             # ⭐ Carte bonus : carte blanche, bordure fine + ombre douce, couleur du bonus en accent
    ├── BonusGlassCard.tsx        # Fond « verre » des cartes (blur + blanc translucide) — CARD_IMAGE_BG / CARD_BG_COLOR
    ├── BonusPageBackground.tsx   # Fond de page + `prefetchBonusBackground()` (préchargé au boot, cf. app/_layout.tsx)
    ├── BonusProgressBar.tsx      # Barre de progression animée réutilisable
    ├── BonusUsageRing.tsx        # Anneau de progression `used/limit` (utilisations du code)
    └── BonusStates.tsx           # BonusSkeleton + BonusEmptyState

src/features/bonus-v2/           # Ancien design plein écran (comparaison) — voir « Ancien design » ci-dessus
└── …                            # Même arborescence, symboles suffixés V2 (BonusV2Provider, useBonusV2…)
```

> **Commande « payée »** = statut `pending`/`finished`/`delivering`/`delivered`
> (constante `PAID_STATUSES`). Sert à la fois au moteur d'éligibilité et aux stats de période.

Point d'entrée monté dans [`app/(tabs)/settings.tsx`](../app/(tabs)/settings.tsx)
(`<UserBonusSheet>`, état `userBonusVisible`). Contrairement aux panneaux « Mes
activités » (`UserOrdersModal`, `UserWalletModal`, en View absolue), la sheet
utilise un **`<Modal>` natif** `transparent` + `animationType="slide"`, avec un
backdrop tapable pour fermer.

> ⚠️ La `<Modal>` **ne démonte pas** son contenu à la fermeture (elle le masque).
> D'où le compteur `openKey`, incrémenté à chaque ouverture, qui ré-arme les
> listeners `scrollX` et force le remontage du carrousel — sans lui, les
> abonnements posés au 1er montage ne suivent plus le carrousel recréé.

---

## Modèle de données (frontend)

Le backend stocke un bonus en forme libre (`{ id, ...data, createdAt }`).
`normalizeBonus()` le convertit vers la forme canonique et tolère les formes
héritées (`order_count`, `type: *_bonus`, `minOrderAmount`…) :

```ts
Bonus {
  id, type,                // type = chaîne libre : 'netflix' | 'free_delivery' | 'free_meal' | 'discount' | <futur>
  name, description,
  criteria: { kind, period?, target?, fastFoodId? },
  fastFoodId?,           // null = bonus plateforme yaammoo
  fastFoodName?,         // ⭐ émetteur — affiché en GROS TITRE de la carte ("yaammoo" par défaut)
  active?, createdAt?, claimDuration?,
  // Code délivré après approbation (fournis par le backend) :
  code?, claimedAt?, expiresAt?, expired?,
  usageLimit?, usageCount?, remainingUses?, redeemed?,
  // Stats affichées sur la carte (fournies par le backend) :
  fastFoodBonusCount?,   // bonus proposés par le fastfood
  userClaimedCount?,     // fois où CE user a pris ce bonus
  totalClaimedCount?,    // fois où TOUS les users l'ont pris
  requestStatus?,        // 'none' | 'pending' | 'approved' (validation fastfood)
  bonusStats?            // { day, week, month } × { count, amount }
}
```

> **Alignement strict backend.** Le frontend ne consomme que les champs réellement
> envoyés par `GET /bonus/all`. Les champs `reward`, `isFastFoodBonus` et
> `validUntil` ont été **supprimés** (jamais renvoyés par le backend ;
> `isFastFoodBonus`/`validUntil` n'étaient de toute façon lus nulle part au rendu).
> `normalizeBonus()` ne fait plus d'inférence sur des formes héritées
> (`order_count`, `minOrderAmount`…) : il lit le payload tel quel.

**Rendu (design) :** fond de page **blanc pur**. Cartes blanches (bordure fine
`rgba(0,0,0,0.04)` + ombre très douce), couleur du bonus en accent. Carte de
pagination outlined en bas, au-dessus de la navbar (galerie à slider à gauche +
panneau « héro » du bonus courant à droite). Pas de flèches prev/next : la
navigation se fait au swipe ou au tap sur une mini-carte, et l'espace libéré
revient au panneau.

**Colonne gauche — galerie (`BonusGalleryCard`).** Mini-cartes **sans bordure ni
cadre** : la carte active se distingue par sa **barre de progression** (largeur
34%→100% interpolée sur `scrollX`), un fond légèrement teinté et le `fontWeight`
de son libellé (piloté par `active`, `Animated` ne sachant pas l'interpoler).
L'ancien surlignage de cadre (deux variantes `slide`/`grow`, composants
`BonusGalleryHighlight`/`BonusGalleryEdge` + constante `GALLERY_HIGHLIGHT_MODE`) a
été **entièrement supprimé** — on ne garde que le langage « barre de progression ».

**Colonne droite — panneau « héro » (`BonusPagerInfo`).** Refonte : le contenu
est calé **en bas** (asymétrie), un **numéro géant en filigrane** (96px, opacité
7%) ancre le panneau. Par-dessus, de haut en bas : ligne condensée (badge icône du
type + émetteur + reste d'utilisations si plafond) · nom du bonus en poids fort ·
statut (dot + label coloré via `useBonusStatus`) · **jauge de position**. La jauge
remplace les anciens dots : sa portion pleine suit `scrollX` de **0 % (premier
bonus) à 100 % (dernier bonus)** — formule `index / (N−1)`, elle n'atteint donc le
plein que sur la toute dernière carte et progresse en continu au swipe.

Le compteur/le contenu textuel, qui n'est pas un style, ne peut pas être
interpolé : il est rafraîchi via `scrollX.addListener` dès le franchissement de la
moitié d'une carte. **Verrou anti-flash** : lors d'un tap direct sur une
mini-carte (`goToBonus`), `scrollX` traverse toutes les cartes intermédiaires
pendant l'animation — un `jumpTarget` (ref) fait ignorer ces étapes au listener,
sinon le titre et la ligne de réclamation défileraient en accéléré jusqu'à la
destination.

Le carrousel reste en
`useNativeDriver: false` car le parent interpole `scrollX` vers des couleurs, ce que
le driver natif ne supporte pas.

### Récompense livrée (`rewardCredentials`)

Provisionnée manuellement puis poussée par socket `bonus.reward_credentials`
(également présente sur `GET /bonus/all`). Structure :

```jsonc
{ "login": "...", "password": "...",
  "profile": { "name": "Profil 3", "code": "4821" } }
```

`profile` est **optionnel** — `undefined` sur les bonus non concernés (non-Netflix).
Le payload traverse `applyClaimPayload` (`useBonus.ts`) qui affecte
`rewardCredentials` en bloc : aucun champ à déclarer côté flux de données.

Quand des identifiants sont livrés, `BonusClaimRow` affiche deux boutons :
**Profil** (outlined, seulement si `profile` existe) et **Compte** (plein). Ils
ouvrent `BonusCredentialsSheet` sur des contenus **disjoints**, via la prop
`section` :

| `section` | Lignes affichées | Titre |
|-----------|------------------|-------|
| `"account"` (défaut) | Email, Mot de passe | Tes identifiants |
| `"profile"` | Profil, Code du profil | Ton profil |

La sheet ne rend rien si `section="profile"` sur un bonus sans profil.

Quand le bonus livre un **code** (et non des identifiants), la ligne affiche
**Activer** (outlined) + **Copier** (plein). ⚠️ `onActivate` n'est **pas encore
branchée** : l'endpoint backend reste à définir, le bouton est visuel seulement.

**Hauteur fixe** : `BonusClaimRow` est bornée à `CLAIM_ROW_H` (52px) — la
description variait de 1 à 3 lignes selon le statut, ce qui faisait « sauter » la
carte de pagination à chaque slide. Titre en `numberOfLines={1}`, description en
`numberOfLines={2}` : le texte s'ellipse au lieu de pousser la carte.

### Critères d'éligibilité (`BonusCriteria.kind`)
| kind | Mesure | Éligible quand |
|---|---|---|
| `welcome` | — | toujours |
| `order_count` | nb de commandes payées | `current >= target` |
| `amount_spent` | montant cumulé payé (FCFA) | `current >= target` |

`criteria.period` (`day` \| `week` \| `month`) est **purement informatif au rendu** :
elle s'affiche en suffixe du compteur sous la barre de progression
(« 19 150 / 50 000 FCFA · sur le mois »). Le moteur d'éligibilité mesure toujours
sur **tout l'historique** — il ne filtre pas sur la fenêtre temporelle.

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

Les deux endpoints exigent `Authorization: Bearer <idToken>`. Le helper
`authHeaders()` (dans `useBonus.ts`) appelle `auth.currentUser?.getIdToken()`
**à chaque requête** : le SDK sert le cache si le token est encore valide et le
régénère sinon. ⚠️ Ne jamais mémoriser ce token dans une variable au login —
les appels partiraient en 401 au bout d'une heure.

## Deep-link
Notification `type: "bonus"` → `/(tabs)/settings?section=bonus` → ouvre `UserBonusSheet`
(voir `notificationRouting.ts` + le `useEffect` sur `section` dans `settings.tsx`).

## À venir (non implémenté)
- Parrainage (code à partager, suivi des filleuls) — l'item Settings s'appelle déjà « Bonus **et parrainage** ».
- Onglet Historique (demandes approuvées/utilisées/expirées) via `GET /bonus-request/:userId`.
- Pastille « N éligibles » sur l'item Settings.
