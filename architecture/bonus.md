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
> `useOrderPeriodStats` reste présent (réserve).

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
│   └── bonusRegistry.tsx         # Descripteur (icône/couleur/label) par type + FALLBACK par défaut
├── config/
│   └── defaultBonuses.ts         # Bonus de démo (fallback si /bonus/all vide ou en erreur) — USE_DEFAULT_BONUSES
├── hooks/
│   ├── useBonus.ts               # GET /bonus/all + normalizeBonus() + claim (POST /bonus-request) + fallback démo
│   ├── useBonusEligibility.ts    # Moteur multi-critères (computeEligibility + hooks) + PAID_STATUSES
│   ├── useBonusFlyer.ts          # GET /bonus/:id/flyer (partage natif) + POST /bonus/:id/claim (preuve vidéo : compression >7 Mo + progression)
│   ├── useCampaignPhase.ts       # Phase de campagne status_view (dates → titre/desc/action)
│   ├── useBonusStatus.ts         # Statut affichable (libellé + couleur + drapeaux) — partagé ClaimRow/PagerInfo
│   └── useOrderPeriodStats.ts    # Stats commandes/dépenses jour · semaine · mois (commandes payées)
└── components/
    ├── UserBonusSheet.tsx        # Coquille : BOTTOM SHEET (hauteur fixe 400) — carrousel + carte de pagination bas
    ├── BonusCarousel.tsx         # Carrousel centré (forwardRef goTo, onIndexChange, peek voisins) — remplit la hauteur
    ├── BonusPagerInfo.tsx        # Colonne droite pagination — panneau « héro » : n° géant en filigrane, icône+émetteur+reste, nom, statut, jauge de position
    ├── BonusGalleryCard.tsx      # Mini-carte de la galerie de pagination : fond + barre de progression interpolés sur scrollX (sans bordure)
    ├── gallery.constants.ts      # Dimensions de la galerie (largeur/gap/pas/radius)
    ├── BonusClaimRow.tsx         # Ligne de réclamation du bonus courant (statut + boutons Réclamer / Profil / Compte)
    ├── BonusCredentialsSheet.tsx # Bottom sheet des identifiants livrés (profil, code, email, mot de passe — copiables)
    ├── BonusSparkline.tsx        # Petit graphique sparkline (tendance commandes)
    ├── BonusCard.tsx             # Carte bonus : carte blanche, bordure fine + ombre douce, couleur du bonus en accent
    ├── BonusGlassCard.tsx        # Fond « verre » des cartes (blur + blanc translucide) — CARD_IMAGE_BG / CARD_BG_COLOR
    ├── BonusPageBackground.tsx   # Fond de page + `prefetchBonusBackground()` (préchargé au boot, cf. app/_layout.tsx)
    ├── BonusProgressBar.tsx      # Barre de progression animée réutilisable
    ├── BonusUsageRing.tsx        # Anneau de progression `used/limit` (utilisations du code)
    └── BonusStates.tsx           # BonusSkeleton + BonusEmptyState
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
  fastFoodName?,         // émetteur — affiché en GROS TITRE de la carte ("yaammoo" par défaut)
  active?, createdAt?, claimDuration?,
  // Code délivré après approbation (fournis par le backend) :
  code?, claimedAt?, startsAt?, expiresAt?, expired?,
  armed?,                // bonus activé → s'applique au prochain checkout éligible
  // Campagne `status_view` (cf. useCampaignPhase) — droits backend + calendrier :
  canDownload?, canUpload?,
  campaignSchedule?,     // { downloadDate, postDate, postWindowStart, postWindowEnd }
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
(également présente sur `GET /bonus/all`). L'event passe par **`reliableEmit`** :
persisté côté backend, rejoué au `join_user` si le user était hors ligne au
moment du provisionnement — ce qui est le cas courant, la récompense arrivant
souvent longtemps après le claim. Le dédoublonnage (`__eventId`) et l'ACK sont
assurés par `withAck`, déjà en place sur le handler. Structure :

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
**Activer** + **Copier** (plein).

#### Armement (bouton Activer / Désactiver)

Le bouton « Activer » est un **toggle à deux états** piloté par `bonus.armed` :
un bonus **armé** s'applique automatiquement au prochain checkout éligible.

| État | Rendu | Appel |
|---|---|---|
| `armed: false` | outlined, éclair creux, « Activer » | `POST /bonus/:id/arm` |
| `armed: true` | **plein** (couleur du bonus), éclair plein, « Désactiver » | `DELETE /bonus/:id/arm` |

Aucun body, juste le Bearer token. Réponse :
`{ success, message, data: { bonusId, armed, disarmedBonusIds, deliveryOffer } }`.

`armBonus(bonus, next?)` (dans `useBonus.ts`) est **optimiste** : la bascule est
appliquée immédiatement, puis `applyArmPayload()` réaligne sur l'état backend —
lui seul connaît les `disarmedBonusIds`, les bonus **auto-désarmés car recouverts**
par celui qu'on vient d'armer. En cas d'échec HTTP, l'état d'origine est restauré
et un toast d'erreur s'affiche. `arming[bonusId]` met le bouton en spinner
pendant la requête.

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
| `status_view` | — (`target: null`) | toujours, si le bonus est actif |

> **`status_view` — barre horaire.** Seul critère dont la progression ne mesure
> pas un avancement vers l'éligibilité : elle reflète **l'heure courante ramenée
> sur 24 h** (`dayProgress()` — minuit 0 %, midi 50 %), et repart à zéro chaque
> jour. Le `case` est placé AVANT le garde `if (!stats)` : il ne lit ni
> `bonusStats` ni `period`. `useDayTick` monte un `setInterval` d'1 min
> **uniquement** pour ce kind, sans quoi la barre resterait figée au montage.

`criteria.period` (`day` \| `week` \| `month`) est **purement informatif au rendu** :
elle s'affiche en suffixe du compteur sous la barre de progression
(« 19 150 / 50 000 FCFA · sur le mois »). Le moteur d'éligibilité mesure toujours
sur **tout l'historique** — il ne filtre pas sur la fenêtre temporelle.

### Dates affichées sur `BonusCard`

| Ligne | Source | Repli |
|---|---|---|
| **Début** | `startsAt` | mois courant seul si absent |
| **Fin** | `expiresAt`, sinon `startsAt + claimDuration` | mois seul (depuis aujourd'hui) si pas de `startsAt` ; `—` sans `claimDuration` |
| **Durée** | `claimDuration` | `—` |

> `startsAt` est la **date de début de validité** posée par le backend ; `claimedAt`
> (date de la réclamation) reste dans le modèle mais n'alimente plus l'affichage.

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
| POST | `/bonus/:id/arm` | Armer un bonus réclamé (sans body) |
| DELETE | `/bonus/:id/arm` | Désarmer un bonus (sans body) |
| GET | `/bonus/:id/flyer` | Flyer d'un bonus `status_view` (sans body) |
| POST | `/bonus/:id/claim` | Réclamation `status_view` (multipart, `proofVideo`) |

### Téléchargement du flyer — `useBonusFlyer.ts`

Sur un bonus `status_view` éligible, la ligne de réclamation ne propose pas
« Réclamer » mais **« Télécharger »** (`isFlyerStep` dans `BonusClaimRow`), et sa
description reprend `bonus.description` (« Poste le flyer en statut WhatsApp »)
plutôt que le texte générique de réclamation.

`GET /bonus/:id/flyer` répond
`{ data: { bonusId, flyerUrl, downloadedAt, lastDownloadedAt, downloadCount,
claimDelayHours, claimableAt } }`. Le fichier est rapatrié dans `Paths.cache`
(`File.downloadFileAsync`, API objet d'`expo-file-system` v19 — pas
`FileSystem.downloadAsync`, déprécié et *throw* au runtime), puis passé à
`Sharing.shareAsync` : la feuille native offre « Enregistrer l'image » (galerie)
ou l'envoi direct vers WhatsApp.

> Le bouton **reste actif** après un premier téléchargement — le user peut
> retélécharger autant de fois qu'il veut, `downloadCount` suit côté backend.

### Calendrier de campagne — `useCampaignPhase.ts`

Le bonus porte `canDownload`, `canUpload` et `campaignSchedule`
(`downloadDate`, `postDate`, `postWindowStart/End`). `computeCampaignPhase()`
(pur, `now` injectable) en dérive une phase, ses textes et son action :

| Phase | Quand | Titre / action |
|---|---|---|
| `upload` | `canUpload: true` | « Envoie ta preuve » · bouton **Envoyer** |
| `before_download` | `canDownload: false` | « Téléchargement demain / le 5 août » · bouton **Télécharger** actif |
| `await_post` | jour de `postDate` ou après | « Poste ton statut aujourd'hui » (+ fenêtre horaire) |
| `download` | cas nominal | « Télécharge ton flyer aujourd'hui » · **Télécharger** |
| `none` | aucun calendrier | retombe sur `bonus.description` |

> ⚠️ **`canDownload` / `canUpload` font autorité, jamais l'horloge du téléphone.**
> Les dates ne servent qu'à formuler le message. Le message de téléchargement
> rappelle systématiquement le jour de publication (« À poster demain. »), et la
> proximité est verbalisée (aujourd'hui / demain / mardi 5 août / le …).

En `before_download` le bouton **reste cliquable** (choix produit) : le clic
remonte `blockedReason` via `onBlocked` → toast `info` porté par
`UserBonusSheet`, plutôt qu'un bouton grisé sans explication. Les refus backend
(400/409) empruntent le même canal.

### Réclamation `status_view` — `POST /bonus/:id/claim`

`multipart/form-data`, champ **`proofVideo`** (vidéo choisie via
`expo-image-picker`), Bearer requis. Réponse 201 → `data` de la même forme que
le socket `bonus.claimed`, donc **`applyClaimPayload` la consomme telle quelle**
(`onProofSent` → `UserBonusSheet`) : le bonus passe en `pending` sans refetch.

Erreurs 400 (flyer jamais téléchargé, délai non écoulé, vidéo absente) et 409
(réclamation déjà active) — les contrôles tournent **avant** l'upload, un claim
refusé ne stocke jamais le fichier.

#### Compression + progression

Au-delà de **7 Mo** (`COMPRESS_THRESHOLD_MB`) la vidéo est recompressée par
`react-native-compressor` (`compressionMethod: "auto"`) avant l'envoi. En
dessous elle part telle quelle : recompresser une petite vidéo coûte du CPU pour
un gain nul. Si la taille est introuvable (`fileSize` absent de l'asset, puis
`getVideoMetaData` en échec), **on ne compresse pas** plutôt que de compresser à
l'aveugle.

> ⚠️ Compression et upload sont **séquentiels** — le fichier doit exister en
> entier avant que le multipart parte. L'utilisateur ne voit qu'une seule barre
> continue : `COMPRESS_SHARE = 0.4` alloue les 40 premiers % à la compression,
> les 60 suivants à l'envoi.

`uploading` est un `Record<string, { phase, progress }>` (clé absente = aucun
envoi en cours). La progression d'upload vient de `onUploadProgress` d'axios ;
si `e.total` manque (variable selon la plateforme) la barre **conserve sa
dernière valeur** au lieu de reculer. `BonusClaimRow` en tire le pourcentage du
bouton, l'icône (`cog-outline` / `cloud-upload-outline`) et le message
(« Compression… » / « Envoi… »), qui priment sur les textes de campagne.

> `react-native-compressor` est un **module natif** : un nouveau build dev est
> requis, un reload JS ne suffit pas.

### ⚠️ `GET /fastFood/all` doit porter le Bearer

C'est là que l'armement devient **visible** : le backend résout les bonus livraison
armés du user et renseigne `deliveryOffer` sur chaque fastfood. La route est
publique (**auth optionnelle**) — sans token elle répond `200` mais avec
`deliveryOffer: null` **partout**, silencieusement, sans erreur HTTP.

`FastFoodContext` envoie donc `Authorization: Bearer <idToken>` dès qu'un user est
connecté, et **refetch sur `user?.uid`** : la restauration de session Firebase est
asynchrone et se termine après le montage du provider, si bien que le tout premier
appel partirait sinon en anonyme.

> `deliveryOffer` ne met **pas** `delivery.prix` à 0 : le prix réel est conservé,
> c'est le front qui affiche la gratuité (prix barré, cf. `checkout.md`).

### Sockets `bonus.armed` / `bonus.disarmed`

Room `<userId>`. Le payload est **identique à la réponse HTTP** de `/arm`
(`{ data: { bonusId, armed, disarmedBonusIds, deliveryOffer } }`), ce qui permet
de réutiliser `applyArmPayload` tel quel. Émis quel que soit l'appareil à
l'origine de la bascule — c'est ce qui synchronise les sessions.

Chaque event a **deux effets**, d'où le double appel dans `useSocketEvents` :

1. `applyArmPayload(p)` → état du bonus (`armed` + `disarmedBonusIds`) ;
2. `applyDeliveryOffer(p.deliveryOffer)` (`FastFoodContext`) → propage l'offre aux
   fastfoods, **sans refetch** de `/fastFood/all`.

Portée dans `applyDeliveryOffer` : offre **plateforme** (`fastFoodId: null`) →
toutes les boutiques ; offre ciblée → la sienne seulement. Au désarmement le
backend envoie `deliveryOffer: null` sans portée, on efface donc partout (un user
n'a qu'une offre livraison active à la fois).

### Socket `bonus.redeemed` — consommation d'une utilisation

Room `<userId>`, via `reliableEmit`. Émis à **chaque** utilisation du code :

```json
{ "data": { "bonusId": "abc123", "code": "A1B2C3", "usageCount": 2,
            "usageLimit": 5, "remainingUses": 3, "redeemed": false,
            "expiresAt": "2026-07-27T10:30:00.000Z" } }
```

Tant qu'il reste des utilisations, `applyRedeemedPayload` ne fait qu'appliquer les
compteurs — l'anneau `BonusUsageRing`, la carte et le panneau héro les lisent déjà,
le décrément se propage donc seul.

**À épuisement** (`redeemed: true` ou `remainingUses <= 0`) le bonus **repart sur
ses critères**, comme s'il n'avait jamais été réclamé :

| Champ | Valeur forcée | Pourquoi |
|---|---|---|
| `requestStatus` | `"none"` | sinon « Bonus validé » resterait affiché |
| `redeemed` | `false` | `true` ⇒ état « Utilisé », qui bloque `isEligible` |
| `code`, `rewardCredentials`, `claimedAt`, `startsAt`, `expiresAt` | `null` | plus rien à délivrer |
| `usageCount` / `remainingUses` | `0` / `undefined` | compteurs remis à zéro |
| `armed` | `false` | un bonus épuisé ne peut plus être armé |

Conséquence UI **automatique** (aucun cas particulier dans les composants) : `fields`
devient vide et `claimAction()` retombe sur **Réclamer** ou **Verrouillé** selon le
moteur d'éligibilité — plus de code affiché, ni de boutons Activer/Copier.

> Ces valeurs sont forcées **côté front** : le backend fait de même, mais le payload
> de l'event ne porte pas `requestStatus` et attendre un refetch laisserait l'UI
> incohérente.

Côté checkout, l'épuisement se comporte comme un désarmement — à ceci près que
l'effacement est **ciblé** : `clearDeliveryOfferForBonus(bonusId)` ne retire que
l'offre issue de CE bonus, préservant celle d'un autre bonus ou d'une campagne
(là où `applyDeliveryOffer(null)` effacerait partout).

> `DesignRouter` recopie `deliveryOffer` dans le menu **au clic** : un armement
> survenant alors qu'un checkout est DÉJÀ ouvert n'y sera pas reflété (il faut
> ressortir puis rouvrir le plat). Cas marginal, non traité.

### Socket `bonus.created` — nouveau bonus

Émis par `POST /bonus` en **broadcast global**, **sans aucun payload** (la réponse
HTTP est inchangée). Le front ne peut donc rien injecter : il refait
`GET /bonus/all` via `refresh(true)` (silencieux, pas de skeleton). C'est la seule
entorse assumée au principe « injection directe, pas de refetch ».

### Socket `bonus.activation_changed` — activation/désactivation par l'émetteur

**Broadcast global** (`io.emit`, aucune room) : tout appareil connecté le reçoit.

```json
{ "data": { "bonusId": "bns_123", "active": false, "type": "netflix",
            "name": "1 mois Netflix offert", "fastFoodId": null,
            "fastFoodName": "Yaammoo", "changedAt": "2026-07-30T10:00:00.000Z" } }
```

`applyActivationPayload` (`useBonus.ts`) patche `bonus.active` — le rendu suit
seul (`useBonusStatus` → « Offre non activée », `BonusClaimRow` → « Bientôt »).

> ⚠️ **Exception : une récompense déjà délivrée survit à la désactivation.**
> Si le bonus porte un code ou des `rewardCredentials`, `inactiveWithReward`
> l'emporte dans `BonusClaimRow` : les boutons **Profil / Compte** (ou
> **Copier**) restent affichés, avec « Ta récompense reste disponible ». Le user
> y a droit — la désactivation ne vaut que pour les réclamations futures. Le
> statut « Inactif » reste visible dans la pile en haut à droite. L'armement,
> lui, disparaît : il ne s'appliquerait à aucun checkout.

Deux effets de bord :

| Cas | Traitement |
|---|---|
| `active: false` | le bonus est aussi **désarmé** localement (armé, il s'annoncerait applicable au prochain checkout) **+** `clearDeliveryOfferForBonus(bonusId)` |
| `active: true` sur un bonusId **absent** de la liste | bonus tout juste créé côté backend → `refresh(true)` silencieux pour le faire entrer dans la liste |

Le « connu / inconnu » se lit sur `bonusesRef` (miroir synchrone de l'état) :
l'updater de `setBonuses` n'est pas exécuté de façon synchrone et ne peut donc
pas décider du refetch.

**Push associé** — `data: { type: "Bonus", event: "bonus.activation_changed",
bonusId, active }`. `getNotificationRoute` compare le `type` **en minuscules**
(le push envoie `"Bonus"`, les notifications stockées `"bonus"`) → deep-link vers
`/(tabs)/settings?section=bonus`.

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
