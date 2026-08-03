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
├── utils/
│   └── orderGroupKey.ts               # Clé de groupage d'une commande (client + date + créneau/zone)
├── services/
│   ├── merchantService.ts             # Appels API marchand
│   └── withdrawService.ts             # Appel POST /wallet/withdraw
└── components/
    ├── OrderManagePanel.tsx            # Panel principal gestion commandes
    ├── MerchantOrderCard.tsx           # Carte commande côté marchand (avec bouton avancer statut)
    ├── MerchantFilterSheet.tsx          # Bottom sheet filtres : dates aujourd'hui/à venir (haut),
    │                                    #   périodes de livraison multi-cochables (milieu), dates passées (bas)
    ├── OtherDatesNotice.tsx            # Rappel 2 cartes (passé rouge / futur bleu) : cmd non traitées
    │                                    #   sur d'autres dates, compteurs globaux
    ├── MerchantOrderBottomSheet.tsx    # Bottom sheet détail commande marchand (mobile) — shell + état + nav globale
    ├── MerchantOrderLivraisonTab.tsx   # Tab Livraison + helpers (InfoCard, Waveform) extraits du sheet
    ├── MerchantOrderCommandesTab.tsx   # Tab Commande : menu/extras/boissons, icônes Ionicons, prix en XAF
    ├── MerchantOrderMontantTab.tsx     # Tab Montant : récap prix par groupe de livraison (deliveryGroupId)
    ├── MerchantOrderBottomSheet.web.tsx # Version web du bottom sheet (auto-contenu)
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
    ├── EditBoutiquePanel.tsx           # Overlay plein écran édition boutique (Settings → "Gérer ma boutique") — orchestrateur
    ├── edit-boutique/                  # Découpage d'EditBoutiquePanel (voir section dédiée)
    │   ├── useEditBoutique.ts          # État + logique (chargement, zones, upload image, sauvegarde)
    │   ├── useToast.ts                 # Toast succès/erreur animé
    │   ├── useEntryAnimation.ts        # Séquence d'entrée du panneau
    │   ├── parseBoutique.ts            # Normalisation deliveryHours (nouveau/ancien format) + hourToDate
    │   ├── groupZones.ts               # Regroupement des zones par lieu (périodique + express)
    │   ├── BoutiqueInfoPage.tsx        # Page 1 : infos générales
    │   ├── DeliveryPage.tsx            # Page 2 : zones de livraison + retrait boutique
    │   ├── DeliveryZoneList.tsx        # Liste des zones : bandeau zone + tableau Heure/Périod./Express
    │   ├── GhostZoneTable.tsx          # Card fantôme (pointillés) comblant l'espace libre sous la liste
    │   ├── ZoneFormSheet.tsx           # Bottom sheet ajout/édition d'une adresse
    │   ├── BoutiquePickers.tsx         # Pickers heure/villes + toast
    │   ├── constants.ts                # CAMEROON_CITIES
    │   └── styles.ts                   # Styles partagés + TAB_BAR_HEIGHT
    ├── MenuManageModal.tsx             # Overlay plein écran gestion menus (Settings → "Gestion menu")
    ├── WalletManageModal.tsx           # Overlay plein écran portefeuille (Settings → "Portefeuille")
    ├── PorteFeuillePanel.tsx           # Panel portefeuille (barre fixe Solde+Retrait, historique jours)
    ├── WithdrawOverlay.tsx             # Overlay retrait (saisie montant → réseau → numéro → verdict)
    ├── WalletDayStatItem.tsx           # Ligne d'une journée dans l'historique portefeuille
    ├── DelegateDriverSheet.tsx         # Feuille "Qui livre ?" (Moi-même / déléguer à un livreur)
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
| `onDelegate` | `(id, driverId) => Promise<boolean>` | Délègue une commande à un livreur (pose `driverId`, statut inchangé) |
| `selectedDate` | `string \| null` | Date sélectionnée (contrôlée par le header de page) |
| `onSelectDate` | `(iso: string \| null) => void` | Remonte le choix de date au header |
| `onDatesChange` | `(opts: DateOption[]) => void` | Remonte la liste des dates disponibles (plus consommé par `boutique.tsx`) |
| `onStatusChange` | `({label, count}) => void` | Remonte l'onglet de statut actif + le nb de commandes affichées, pour la pilule du header |

**Onglets statut** :
| Key | Label | Statuts Firestore |
|---|---|---|
| `pending` | En Attente | `pending` |
| `proccess` | En cours | `processing`, `active`, `in_progress` |
| `finish` | Terminées | `completed`, `finished`, `done`, `delivering` |

**Filtre par date** : le choix de date passe désormais par le `MerchantFilterSheet`.
Le `DatePill` du header de `boutique.tsx` a été **remplacé** par un `HeaderPill` en lecture
seule affichant **« N cmd \<statut\> »** (statut actif + nb de commandes réellement
affichées, filtres date/périodes compris), alimenté par `onStatusChange`. Le **sous-titre**
du header continue d'indiquer le jour affiché.
Le panel ne rend plus sa propre ligne de chips date. Pour éviter une boucle de rendu, l'effet
qui remonte les dates dépend d'une clé stable `datesKey = sortedDateISOs.join(",")`.

**Tri par rank** :
- Onglets `pending` et `proccess` : `dateFilteredOrders` triés par `rank ASC` via `useMemo`
- Commandes sans rank → en dernier (`Infinity`)

**Groupement des commandes d'un même client** (`groupBySlot`, onglets `pending` / `proccess`) :
- Regroupement **par clé**, sans condition de rangs consécutifs. La clé est produite par
  **`utils/orderGroupKey.ts`** — règle unique partagée avec l'onglet Montant du sheet :

| Type de livraison | Clé de groupe |
|---|---|
| Programmée (`delivery.status === true`, `type !== 'express'`, `time` présent) | `userId` + **date** + `delivery.time` + `delivery.zone` (fallback `location`) |
| Express (`delivery.status === true`, `type === 'express'`) | `userId` + **date** + `delivery.zone` (fallback `location`) |
| Sur place (`delivery.status !== true`) | `userId` + **date** |

> La **date** (`delivery.date`, sinon `createdAt`) fait partie de la clé : sans elle, les
> commandes d'un même client sur des jours différents fusionneraient en un seul groupe.

- Chaque groupe donne **une seule ligne**, qui affiche la commande **la mieux classée**
  (`rank` le plus petit) et prend sa position au classement. Ex. rangs 1, 4, 5 à 11h →
  une ligne au rang 1.
- L'ancienne 2ᵉ passe de « fusion des contiguës » (express / sur place fusionnés seulement
  sur des rangs strictement consécutifs) est **supprimée** : le groupement par clé la couvre.
- Aucun indicateur de lien n'est affiché pour les commandes non fusionnées : le rang
  étant une position relative recalculée à chaque validation, tout repère par numéro
  devient faux (voire pointe vers la commande d'un autre client) dès la première
  validation.
- `displayRows` (`{ head, group }[]`) remplace `dateFilteredOrders` au rendu.

> ⚠️ Les **sections accordéon « Commandes des jours précédents »** (anciennement rendues
> sous la liste en `pending` / `proccess`) ont été **supprimées** : les dates passées sont
> désormais accessibles via les chips « Cmd passées non traitées » du `MerchantFilterSheet`,
> qui les charge dans la liste principale. `pastSections` et le style `sectionLabel` du
> panel n'existent plus. À la place, le composant **`OtherDatesNotice`** signale ce qui
> existe sur d'AUTRES dates que celle affichée. Un tap ouvre le `MerchantFilterSheet`.

### `OtherDatesNotice` — rappel passé / futur

Deux cartes **côte à côte, à hauteur égale** (`alignItems: stretch` + `flex: 1`), une par
cas ; chacune ne s'affiche que si son compteur est > 0 :

| Carte | Libellé | Couleur |
|---|---|---|
| Passé | `{N} Commandes passées non traitées` | rouge `#C0392B` (du retard) |
| Futur | `{N} Commandes futur pas encore traité` | bleu `#2E6FD9` (planning) |

- **Compteurs GLOBAUX** (`untreatedCounts`) : ils comptent les commandes non traitées
  (`pending` + `proccess`) sur tous les jours passés / à venir, **indépendamment de
  l'onglet de statut ET de la date filtrée**. Seule la date affichée est exclue — inutile
  d'annoncer ce qu'on est en train de regarder.
- Rendu sur les **trois onglets**, y compris `finish` (dont le rendu est un bloc séparé).
- Prop `inset={false}` dans les états vides : leur parent porte déjà son padding
  horizontal, sinon les marges s'additionnent.

> **Liste vide** : le message « Aucune commande … » reste **centré verticalement**
> (hauteur = fenêtre − barres fixes, via `emptyStateHeight`) et les cartes s'affichent
> dessous. Sur une liste non vide, elles sont rendues en **fin de liste**.
- La carte **ne change pas de design** : le groupe est passé via `sheetOrders` (et non
  `allOrders`, qui bascule sur la variante groupée). Seul le bottom sheet reçoit la nav
  multi-cmd, alimentée quand `sheetOrders.length > 1`.
- **Deux portées de validation** : le bouton de la **carte** traite toute la ligne groupée
  (`Promise.all` sur `onUpdateStatus`) ; celui du **sheet** (onglet Commande) ne valide que
  la Cmd affichée, via `onValidateOne(orderId, status)`.

**Layout "Terminées"** (onglet `finish`) :
- Groupement par type de livraison : Express (groupe unique) + Scheduled (groupes par créneau horaire)
- Chaque groupe : header collapsible + bouton **"Lancer tout"** → ouvre le `DelegateDriverSheet`
  pour tout le groupe (`setDelegateGroup`) : le marchand choisit **Moi-même** (`delivering` sur
  chaque commande) ou **déléguer** à un livreur (pose `driverId` sur chaque commande via `onDelegate`).
- Au déroulé d'un groupe (Express ou slot horaire), **3 sous-tabs** apparaissent :
  - **En attente** : commandes du groupe dont le statut = `finished`
  - **En cours** : commandes du groupe dont le statut = `delivering` (animation vélo)
  - **Terminé** : commandes du groupe dont le statut = `delivered` (livrées par le livreur)
  - Chaque sous-tab affiche un badge compteur. L'onglet "En attente" est actif par défaut.
  - L'état actif par groupe est stocké dans `groupSubTab` (`Record<groupId, 'en_attente'|'en_cours'|'termine'>`).
  - `statusMap.finish = ["completed","finished","done","delivering","delivered"]`.
- Les commandes du même utilisateur dans un groupe sont affichées via un seul `MerchantOrderCard` avec `allOrders`

**Layout "En Attente" / "En cours"** :
- `FlatList` simple avec `MerchantOrderCard` pour chaque commande

**Barre de filtres en BAS** (design partagé avec « Mes livraisons ») :
- Le **badge** de chaque chip compte les commandes de la **date active** (et des périodes
  cochées), pas le total tous jours confondus — sinon le badge du jour affiché incluait
  des commandes passées.
- Les chips de statut (En Attente / En cours / Terminées, avec badge compteur) ne sont
  **plus** dans la barre fixe du haut : ils sont rendus par `StickyChipsRow`
  (`features/driver/components`) dans une barre `position: absolute` posée juste au-dessus
  de la navbar, **collée à elle** : `bottom = useTabBarHeight()` (58 + `insets.bottom`,
  la vraie hauteur de la tab bar — pas de constante approximative). À droite, une icône
  `options-outline` ouvre le `MerchantFilterSheet`.
- Fond **flouté** (`BlurView` intensité 40 + voile blanc 55 %) : les cartes qui scrollent
  derrière restent devinables.
- La barre fixe du haut ne contient plus que les **stat-boxes**.
- `listPadBottom` réserve `tabBarHeight + FILTER_BAR_HEIGHT + 24`.

**MerchantFilterSheet.tsx** — bottom sheet de filtres, **hauteur FIXE** (`height: 58%`) :
beaucoup de créneaux ne fait plus grandir le sheet, le contenu scrolle à l'intérieur.

| Zone | Contenu |
|---|---|
| Haut (fixe) | **Aujourd'hui** et **Cmd à venir**, deux colonnes **côte à côte**, chacune label au-dessus / chips en dessous |
| Milieu (scroll) | « Toutes les périodes », **Livraison express**, **Pas de livraison** en **lignes cochables** ; puis **Créneaux horaires** en **grille de tuiles** (design de l'onglet Extra du sheet home). **Multi-sélection** sur l'ensemble |
| Bas (fixe) | **Cmd passées non traitées** (En Attente / En cours) ou **Cmd passées** (Terminées) — piloté par la prop `pastUntreated` |

- Chaque période affiche son **nombre de commandes** (calculé sur la date active et le
  statut courant) : pastille sur les lignes cochables, badge d'angle sur les tuiles
  de créneau. « Toutes les périodes » porte le total (`allPeriodsCount`).
- `selectedPeriods: string[]` dans le panel (vide = toutes). Clé de période d'une commande :
  `surplace` (`delivery.status !== true`), `express` (`delivery.type === 'express'`),
  sinon `delivery.time`. Le filtre s'applique dans `dateFilteredOrders`.
- Les périodes proposées sont **dérivées de la date active** ; une période cochée qui
  disparaît est retirée automatiquement.

**Barre fixe + scroll-under + snap** :
- La barre stats est en `position: absolute` (`top: topOffset`, mesurée via
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
| `allOrders` | `Commande[]` | Toutes les commandes du groupe (optionnel, pour livraisons groupées) — **bascule la carte sur le design groupé** |
| `sheetOrders` | `Commande[]` | Commandes du groupe transmises **au seul bottom sheet** (nav multi-cmd) : la carte garde son design standard (voir `groupBySlot`) |
| `isForceLaunched` | boolean | État lancé forcé (depuis "Lancer tout") |
| `onUpdateStatus` | `(status) => Promise<void>` | Callback avancement statut |
| `onDelegate` | `(driverId) => Promise<void\|boolean>\|void` | Délègue la commande à un livreur |
| `onValidateOne` | `(orderId, status) => Promise<void\|boolean>\|void` | Valide **une seule** commande (bouton du sheet). Défaut : `onUpdateStatus` (toute la ligne) |

**Affichage en `N cmd`** (variante standard) — déclenché dans deux cas :
1. **ligne groupée** (`sheetOrders.length > 1`) → N = nb de commandes du groupe ;
2. **commande seule portant au moins un extra ou une boisson** → `1 cmd …`. La présence
   d'un extra/boisson ne fait que **déclencher** ce libellé ; N reste le nombre de
   commandes (1), pas le nombre d'articles. Les entrées placeholder `Aucun`/`Aucune`
   ne déclenchent rien (règle de `computeItemsTotal`). Vaut pour **tous** les modes,
   y compris sur place → `1 cmd · pas de livraison`.

Sans extra ni boisson, une commande seule affiche `N plat(s) · <livraison>`
(`quantity`, le nom du menu n'est plus affiché),
où `<livraison>` vaut `livrée à <heure>`, `livraison express` ou `pas de livraison`
(même information, sans le préfixe `N cmd`).

- Le nom du plat est remplacé par un libellé dépendant du type de livraison :

| Livraison | Libellé |
|---|---|
| Programmée (`delivery.time`) | `N cmd livrées à <heure>` |
| Express | `N cmd livraison express` |
| Sur place (`delivery.status !== true`) | `N cmd · pas de livraison` |

- **Montant** — cas 1 (ligne groupée) : `computeGrandTotal(sheetOrders)`, la **même**
  valeur que le « Total général » de l'onglet Montant du sheet. Cas 2 (commande seule) :
  `order.total`, inchangé — seul le libellé change.

**Bouton d'action** : avance le statut selon la transition backend (pas de statut cible envoyé explicitement — le backend détermine le suivant).

**Bouton "Lancer"** : ouvre le `DelegateDriverSheet` (`setDelegateVisible(true)`) → **Moi-même**
(`onUpdateStatus("delivering")`) ou **déléguer** (`onDelegate(driver.driverId)`). Une commande déjà
déléguée (`order.driverId` posé, pas encore en `delivering`) affiche un badge **« Délégué »**.

---

## DelegateDriverSheet.tsx

**Chemin** : `yaammoo/src/features/merchant/components/DelegateDriverSheet.tsx`

Feuille de choix **« Qui livre cette commande ? »** ouverte par le bouton Lancer (carte
individuelle) ou "Lancer tout" (groupe).

**Props** : `visible`, `onClose`, `onSelfDeliver` (livrer soi-même → `delivering`),
`onDelegate(driver)` (pose `driverId`). Les deux callbacks renvoient `Promise<boolean|void>`.

**UX** :
- `Modal animationType="fade"` : l'overlay noir apparaît **en fondu** (pas de sheet qui monte).
- Ligne **« Moi-même »** + liste des livreurs de la boutique (`driverService.getDrivers(fastFoodId)`).
- **Feedback** : au clic sur une ligne, `run(key, action)` garde le sheet ouvert avec un
  **spinner sur la ligne** choisie (les autres grisées), ferme **au succès**, ou affiche
  **« Échec, réessayez. »** inline si l'action renvoie `false`/throw.

---

## MerchantOrderBottomSheet.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MerchantOrderBottomSheet.tsx`

Bottom sheet détail d'une commande marchand, refactoré en **shell + tabs** :
- `MerchantOrderLivraisonTab` : infos livraison (client, adresse, note vocale, montant)
- `MerchantOrderCommandesTab` : détails de la commande (menu, extras, boissons avec icônes et prix)
- `MerchantOrderMontantTab` : récapitulatif des prix, groupé par `deliveryGroupId`

> ⚠️ **Pool de l'onglet Montant.** Le sheet recompose le groupe ABSOLU depuis
> `groupPool` (toutes les commandes de la boutique) via `orderGroupKey` : il faut
> en **exclure `pendingToBuy` / `cancelByUser` / `cancelByFastFood`**.
> `pendingToBuy` = encore dans le panier du client, jamais commandée — elle
> gonflait le récap (2 commandes en cours affichées comme 4). À respecter partout
> où l'on réutilise `MontantTab` avec un pool absolu.
>
> Côté client (`OrderBottomSheet` + `CartStatusPanel`), `MontantTab` reçoit
> directement le groupe déjà filtré par statut : pas de pool absolu, pas de piège.

**Navigation zone → Cmd (header du sheet)** : quand la ligne porte plusieurs zones,
le header affiche les **chips de ZONES** (à la place des « Cmd »), et une barre de
chips **« Cmd N »** apparaît **sous les onglets**, limitée aux commandes de la zone
sélectionnée. Les onglets individuels (Livraison / Commande / Livreur) suivent la Cmd
choisie ; l'onglet **Montant est ancré sur la ZONE**, pas sur la Cmd — il montre donc
toutes les commandes de cette zone (tous statuts) et jamais celles d'une autre zone.
Une seule carte client suffit alors dans la liste des Terminées.
- `DriverInfoTab` : infos livreur (uniquement si `delivering` / `delivered`)

La navigation entre tabs est gérée par `selectedTab` dans le sheet parent.

**Zone de livraison** (versions native `.tsx` ET web `.web.tsx`) :
- Sous le nom/prénom (header), on affiche `Zone de livraison : {zone}` — lue depuis
  `order.delivery.zone`. Fallback sur l'adresse si `zone` absent (anciennes commandes).
- `buildUser()` expose `zone` et `deliveryPrice` (depuis `order.delivery.prix`).

**Animation d'ouverture** : l'effet dépend de `order?.id`, **pas** de l'objet `order`.
Au retour d'arrière-plan, un refresh des données fournit une nouvelle référence pour
la même commande ; en dépendant de l'objet, l'animation se rejouait et le sheet
semblait se fermer puis se rouvrir.

**Sélecteur multi-commandes dans le header** (native `.tsx`) :
- En multi-commandes (`allOrders.length > 1`), la ligne « Zone de livraison » du header
  est **remplacée** par une rangée de chips numérotés (1, 2, 3…) scrollable
  horizontalement. En commande unique, la ligne zone/adresse est conservée.
- Débordement : un badge **`+N`** à droite indique les chips hors écran. `N` est
  recalculé au scroll (`contentWidth - viewportWidth - scrollX`) et **disparaît**
  une fois la rangée entièrement parcourue.
- L'ancienne barre de navigation basse (`Cmd 1 / Cmd 2` + flèches) est supprimée.
- Le `PanResponder` du header ne réagit qu'aux gestes verticaux (`dy > 5`), donc le
  scroll horizontal des chips n'est pas capturé.

**Bouton Valider + garde de consultation** (native `.tsx` uniquement) :

| Prop | Type | Description |
|---|---|---|
| `canValidate` | boolean? | Affiche le bouton « Valider » dans la ligne de total de l'onglet Commande |
| `onValidate` | `(order: Commande) => Promise<void> \| void`? | Valide **la commande passée en argument** (celle affichée) |

- Le bouton vit dans la **ligne de total** de l'onglet Commande (voir
  `MerchantOrderCommandesTab`), pas dans le header.
- Pendant l'appel (`validating`), le bouton affiche un `ActivityIndicator` et le
  libellé « Validation… », et reste désactivé.
- Il est **propre à la commande affichée** : il ne valide qu'elle et ne vérifie que
  la consultation de ses propres extras/boissons.
- **Garde** : si la commande affichée contient des extras ou boissons sélectionnés,
  son onglet Commande doit avoir été **scrollé jusqu'en bas**. `CommandesTab` remonte
  `onFullyScrolled` quand le bas est atteint — ou immédiatement si le contenu tient
  dans la fenêtre sans scroll. Sans extra ni boisson, la commande est consultée d'office.
- Tant que la commande affichée n'est pas consultée, le bouton est grisé (icône cadenas)
  et un clic affiche un `Toast` d'erreur nommant le type manquant — préfixé de
  `Cmd N : ` en multi-commandes.
- **Fermeture après validation** : `validatedIdx` suit les commandes déjà validées
  pendant l'ouverture. S'il en reste au moins une non traitée, le sheet **reste ouvert**
  et bascule automatiquement sur la première d'entre elles ; sinon il se ferme.
  En commande unique, la validation ferme donc toujours le sheet.
- **Chips « Cmd » du header** : numérotés par le **vrai `rank`** de la commande
  (`(o as any).rank ?? idx + 1`), et non par la position dans la liste — cohérent avec
  l'onglet Montant. Le préfixe `Cmd N : ` du toast utilise le même numéro. Idem dans la
  variante `.web.tsx`.
- **Pas de croix ✕** dans le header : la place revient aux chips Cmd. La fermeture se
  fait par **swipe vers le bas** (`PanResponder`, `dy > 100`), **tap sur l'overlay**, ou
  le bouton retour Android (`onRequestClose`).
- Les états `checkedIdx` (consultation) et `validatedIdx` (validées), indexés par
  position de commande, sont réinitialisés à chaque ouverture du sheet.
- Le bouton « Valider » de `MerchantOrderCard` est inchangé (aucune garde dessus) et
  agit sur **toute la ligne groupée**, contrairement à celui du sheet.

---

## MerchantOrderLivraisonTab.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MerchantOrderLivraisonTab.tsx`

Tab « Livraison » extrait de l'ancien `MerchantOrderBottomSheet`. Contient :
- `InfoCard` : carte compacte affichant le nom du client, l'adresse, la note
- `Waveform` : visualisation de la note vocale (si présente)
- Récapitulatif des montants

---

## MerchantOrderCommandesTab.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MerchantOrderCommandesTab.tsx`

Tab « Commande » extrait de l'ancien `MerchantOrderBottomSheet`. Affiche :
- Le menu commandé avec son prix. **Le visuel du plat** (`menu.coverImage` /
  `menu.image`, exposé par `buildItems()` via `OrderItem.image`) remplit la case
  d'icône ; à défaut, on retombe sur `fast-food-outline`.
- La liste des extras (icônes, noms, prix)
- La liste des boissons (icônes, noms, prix)
- **Ligne livraison** (si `deliveryPrice > 0` ou `zone`) : libellé "Livraison" + la
  **zone** en sous-texte, prix à droite (`deliveryPrice`). Le prix est remplacé par :
  - **« Offert »** si `deliveryOffer.active === true` et `deliveryOffer.coveredBy === 'fastfood'` ;
  - **« Cmd groupée »** si **au moins 2 commandes du sheet** partagent le même
    `deliveryGroupId` (course facturée une seule fois pour le groupe, sur la commande
    `courseBilled === true`). Un `deliveryGroupId` isolé ne déclenche rien.
  Dans les deux cas la livraison n'entre **pas** dans le total affiché : on ne somme que
  plat + extras + boissons. Le libellé passe de « Total commande » à **« Total »** quand
  la commande est groupée.

---

## MerchantOrderMontantTab.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MerchantOrderMontantTab.tsx`

Onglet **Montant** du bottom sheet : récapitulatif des prix du **groupe absolu** de la
commande affichée.

- **Groupe absolu** : le sheet reçoit `groupPool` (toutes les commandes de la boutique,
  transmis par `OrderManagePanel` → `MerchantOrderCard`) et retient celles qui partagent
  la même `orderGroupKey` que la commande affichée — **tous statuts confondus**.
  Le récap est donc **identique** que le sheet soit ouvert depuis « En attente »,
  « En cours » ou « Terminées » : il n'obéit qu'à la règle de groupage.
- **Visible uniquement** si ce groupe compte au moins 2 commandes.
- Chaque ligne `Cmd N` porte un **chip d'état** (En attente / En cours / Prête /
  En livraison / Livrée / Annulée) — le groupe pouvant mélanger des stades différents.

- **Regroupement par `deliveryGroupId`** : une commande sans groupe forme son propre bloc
  (clé `solo_<id>`). Chaque bloc liste ses commandes triées par `rank` **croissant**, et
  les **blocs eux-mêmes** sont ordonnés par le rang de leur commande la mieux classée.
  Une commande **terminée n'a plus de rang** : elle passe en fin de bloc, et un bloc
  entièrement terminé en fin de liste (`rank ?? Number.MAX_SAFE_INTEGER` — pas `Infinity`,
  dont la soustraction donnerait `NaN` et casserait le comparateur).
- **Une ligne par commande** : `Cmd <rank>` (le vrai rang) + montant articles
  (`computeItemsTotal` = plat × quantité + extras + boissons sélectionnés).
- **Ligne livraison du groupe** — masquée si `delivery.status !== true` (sur place) :
  `Livraison <heure>` si `delivery.type` programmé,
  `Livraison Express` si express, avec la **zone** en sous-texte. Le montant est celui de
  la commande du groupe portant `courseBilled === true` ; **« Offert »** si son
  `deliveryOffer` est actif et couvert par le fastfood ; **« Non facturée »** si aucune
  commande du bloc ne porte `courseBilled`.
- **Total du bloc** = somme des articles + course (0 si offerte).
- **Gabarit identique à l'onglet Commande** : carte plafonnée à `maxHeight` (prop
  optionnelle, défaut `340` — le sheet client passe une valeur plus basse), blocs
  groupes scrollables au-dessus d'une ligne de total fixe.
- **Total général** (ligne fixe en bas) : **toujours affiché**, somme des totaux de tous
  les blocs (`computeGrandTotal`). L'ancienne condition `groups.length > 1` le masquait
  à tort : l'onglet n'apparaît qu'à partir de 2 commandes, mais celles-ci partagent
  souvent un **seul `deliveryGroupId`** (livraison groupée) et ne forment donc qu'un
  bloc — d'où les onglets Montant sans total général.

**Helpers exportés** (règle de calcul unique, réutilisée par `MerchantOrderCard`) :
| Helper | Rôle |
|---|---|
| `computeItemsTotal(order)` | Articles d'une commande : plat × qty + extras + boissons |
| `buildDeliveryGroups(orders)` | Blocs par `deliveryGroupId` + désignation du `courseBilled` |
| `computeGrandTotal(orders)` | Articles de toutes les commandes + course de chaque bloc (facturée une fois, 0 si offerte / sur place / non facturée) — utilisé par `MerchantOrderCard` |
| `deliveryLabel(order)` | `Sur place` \| `Express` \| heure du créneau (interne à l'onglet Montant) |

**Icônes** — `Ionicons` alignées sur le bottom sheet du home
(`checkout/components/tabs/DetailTab.tsx`), jamais d'emoji (R15) :

| Type | Icône | Fond |
|---|---|---|
| `menu` | image du plat, sinon `fast-food-outline` | `#F0FDF4` |
| `extra` | `add-circle-outline` | `#FFF7ED` |
| `drink` | `wine-outline` | `#EFF6FF` |
| livraison | `bicycle-outline` | `#FEF2F2` |

> `iconBox` porte la taille et le fond ; `iconBoxCentered` n'est appliqué qu'aux
> icônes — l'image du plat, elle, remplit la case (`contentFit="cover"`).

**Hauteur** : la carte grise est plafonnée à `maxHeight: 340`. Le sheet étant à
hauteur fixe (`SHEET_HEIGHT = 520`), sans ce plafond la liste pousse la ligne de
total hors de la zone visible.
- **Ligne de total** (fixe, sous la liste scrollable) : libellé « Total commande » avec
  le montant **en dessous** (inclut le prix de livraison : `total + deliveryPrice`), et
  le **bouton Valider à droite**.

**Props de validation / consultation** :

| Prop | Type | Description |
|---|---|---|
| `onFullyScrolled` | `() => void`? | Remonté une seule fois quand la liste a été vue en entier |
| `canValidate` | boolean? | Affiche le bouton Valider dans la ligne de total |
| `checked` | boolean? | La commande a-t-elle été consultée (pilote grisé/cadenas) |
| `onValidate` | `() => void`? | Clic sur Valider (le parent gère la garde et le toast) |
| `validating` | boolean? | Désactive le bouton pendant l'appel |

- La détection « tout vu » combine `onScroll` (bas atteint à `SCROLL_END_SLOP` = 24 px près),
  `onLayout` et `onContentSizeChange` : si le contenu tient dans la fenêtre, rien à
  scroller → remonté immédiatement. Un `useRef` garantit une seule remontée par montage.
- Le sheet remonte la tab et réarme la détection à chaque changement de Cmd via
  `key={selectedOrderIdx}`.

---

## MerchantOrderBottomSheet.web.tsx

**Chemin** : `yaammoo/src/features/merchant/components/MerchantOrderBottomSheet.web.tsx`

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

**Découpage** (dossier `edit-boutique/`) : le panneau ne fait plus que l'orchestration
(header, pagination 1/2, montage des sous-composants). Tout l'état et la logique vivent
dans `useEditBoutique` ; le rendu est réparti entre `BoutiqueInfoPage` (page 1),
`DeliveryPage` + `DeliveryZoneList` (page 2), `ZoneFormSheet` (bottom sheet d'adresse)
et `BoutiquePickers` (pickers heure/villes, toast). `parseBoutique.ts` normalise les
`deliveryHours` renvoyés par l'API (nouveau format objet ou ancien `string[]`) et
`groupZones.ts` regroupe les zones par lieu pour l'affichage.

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
