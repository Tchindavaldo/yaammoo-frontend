# Home — micro-pause au scroll (EN COURS, non resolu)

> Etat au 2026-09-18. Branches : `debug/home-scroll-frein` (mesure, FONCTIONNE)
> et `feature/home-flashlist` (recyclage, NON RESOLU).
>
> A lire avant de reprendre le sujet : tout ce qui suit a ete MESURE, pas
> suppose. Plusieurs hypotheses plausibles ont ete dementies par les logs — ne
> pas les refaire sans nouvelle mesure.

---

## Le symptome

Au scroll vertical du home, une micro-pause a chaque rangee qui entre a l'ecran.
**Invisible a l'oeil, nettement sentie sous le doigt** : le geste est continu, il
detecte la rupture de fluidite bien mieux que l'oeil.

Une frame dure 16 ms a 60 fps. Un montage de rangee coute 63 a 392 ms, soit 4 a
24 frames perdues d'affilee.

---

## L'outil de mesure (a garder)

`src/features/restaurants/utils/rowProbe.ts` et `useRowCommitProbe.ts`.

Branchee dans les 7 `DesignN.tsx` :
`useRowCommitProbe(N, fastFood.menu?.length ?? 0, (fastFood as any)?.id)`.

Elle journalise trois choses :

| Log | Sens |
|---|---|
| `1er montage` | la rangee monte pour la premiere fois — cout incompressible |
| `REMONTAGE n=K` | la MEME boutique remonte : cout repaye pour rien |
| `DEMONTAGE` | la cellule est detruite — preuve qu'aucun recyclage n'a lieu |

`ROW_PROBE_ENABLED = false` eteint tout d'un coup.

> ⚠️ Ne pas mesurer une duree avec `Date.now()` capture au rendu et relu dans un
> `useEffect` : l'effet s'execute bien apres le rendu (valeurs fausses, on a vu
> « 42909 ms »). La sonde utilise `useLayoutEffect`, qui suit le commit.

---

## Mesures obtenues

### Cout de montage d'une rangee (iPhone reel, Expo Go)

| variant | menus | commit | par menu |
|---|---|---|---|
| 7 | 10 | 392 ms | 39 ms |
| 7 | 13 | 260 ms | 20 ms |
| 7 | 3 | 67 ms | 22 ms |
| 4 | 12 | 265 ms | 22 ms |
| 6 | 6 | 332 ms | 55 ms |
| 5 | 3 | 67 ms | 22 ms |

**Le cout croit avec le nombre de menus** : les rangees sont des `ScrollView` +
`.map()` (les 7 designs), sans virtualisation horizontale. Tous les menus
montent, y compris hors ecran a droite.

> ⚠️ L'ancienne note « aucun lien avec le nombre de menus (1 menu = 81 ms,
> 5 menus = 50 ms) » de `restaurants.md` ne vaut QUE pour de petites boutiques,
> ou le cout d'amorçage domine. Elle est fausse a 10-13 menus.

### Ce qui n'est PAS la cause (dementi par la mesure)

- **Les BlurView.** Le comptage statique donnait 7 BlurView par carte sur le
  variant 1 — coupable ideal. Mais le variant 1 n'apparait jamais dans les logs,
  et le plus cher mesure (variant 7, 392 ms) n'en porte qu'UN. Sur Android
  `disableAndroidBlur` les reduit deja a de simples `View`.
- **`windowSize` a 11.** L'ancienne note disait « teste, aucun effet ». **A 15,
  la mesure montre l'inverse** : les remontages disparaissent (voir plus bas).

---

## Ce qui FONCTIONNE — `windowSize={15}` (branche `debug/home-scroll-frein`)

A `windowSize={5}`, les rangees sortant de la fenetre etaient detruites puis
recreees au retour : 63-90 ms repayes a chaque passage.

A **15**, plus aucun `REMONTAGE` pendant le scroll. Ressenti utilisateur :
« hyper fluide ». **Livrable en OTA**, aucun natif.

`windowSize` compte des HAUTEURS D'ECRAN, pas des items : a 15, ~7 ecrans de
part et d'autre du viewport. Il n'y a donc **aucun seuil periodique** « toutes
les N boutiques ».

**Limite connue** : au-dela de cette fenetre les rangees sont demontees ; en
remontant tres loin, la pause revient. `resetToFirstPage()` limite deja ce cas en
tronquant la liste au retour en haut. Contrepartie : plus de cellules montees =
plus de memoire, a surveiller sur appareil modeste.

---

## Ce qui NE FONCTIONNE PAS — FlashList (branche `feature/home-flashlist`)

Objectif : supprimer la pause **par construction** en reutilisant les vues au
lieu de les detruire. `@shopify/flash-list` 2.0.2, New Architecture (seule supportee depuis le SDK 55).

**Resultat : PIRE qu'avec FlatList.** La sonde `DEMONTAGE` prouve que les
cellules sont bel et bien detruites — le recyclage ne prend pas.

### Corrections deja faites (a conserver, elles sont justes)

Le recyclage exige que **la FORME de l'arbre React ne depende ni d'une position
ni d'un etat**. Trois violations trouvees et corrigees :

| Fichier | Ce qui changeait la structure | Correctif |
|---|---|---|
| `DesignRouter.tsx` | provider absent si `listIndex === 0`, present sinon | provider TOUJOURS monte, nouveau drapeau `passthrough` |
| `DesignItem.tsx` | `{!skeletonGone ? <squelette> : null}` | squelette toujours monte, pilote en opacite |
| `MerchantHeader.tsx` | idem | idem |

`ShopRevealProvider` accepte desormais `passthrough` : il republie la valeur du
groupe parent au lieu de creer le sien, sans disparaitre de l'arbre.

Bonus : `CardSkeleton` recoit `animating`. Sa boucle de respiration interpole une
COULEUR (`useNativeDriver: false`), donc tourne sur le thread JS — la couper des
que le squelette est invisible libere du thread pendant le scroll.

### Le symptome qui reste, et l'indice principal

Les `DEMONTAGE` arrivent **GROUPES** — tous les ids en bloc — et **non au
fil du scroll**.

> Correction 2026-09-18 (branche `debug/home-flashlist-demontage`) : le `#n` du
> log etait assigne au MONTAGE mais imprime au DEMONTAGE — son ordre ne prouve
> rien. La sonde distingue desormais `MONTAGE-CELL`/`DEMONTAGE` (cycle reel,
> deps `[]`) de `REBIND` (recyclage vers une autre boutique). Relire les logs
> avec cette grille avant de conclure.
>
> Correction 2026-09-18 soir : `liveY=0` prouve que les resets sont légitimes
> (retour en haut). Boucle fixée : `handleMomentumEnd` lit `contentOffset.y` réel.
> 
> Etat final (branche `debug/home-flashlist-demontage`) :
> - **Scroll vers le bas** (loadMore) : pause ~40-110 ms = 1er montage des nouvelles
>   cellules (inévitable — pas de cellules à recycler tant qu'elles n'ont pas existé).
> - **Scroll vers le haut** (reset) : destruction sans coût perçu, puis remontage
>   des 5 cellules page 1 si l'utilisateur redescend.
> - **Scroll continu** (REBIND) : 0 ms, le recyclage FlashList MARCHE.
> 
> La micro-pause « ultrafine » ressentie est le 1er commit des nouvelles cellules.
> Elle a chuté de 63-90 ms (FlatList + windowSize=5) à ~40 ms (FlashList) — plus de
> recyclage = plus de pause *périodique*. L'indice critique reste : aucune
> destruction groupée pendant le scroll (seuls REBIND).
> 
> **Livrable** : `debug/home-scroll-frein` (windowSize=15, FlatList) est OTA-fluide.
> `feature/home-flashlist` recycle mais n'apporte pas de gain visible supérieur —
> le goulot est le montage initial des cellules (`ScrollView` + 10-13 menus, pas de
> virtualisation horizontale). Gain réel = traiter les rangees horizontales.

**Une destruction groupee n'est pas de la virtualisation : c'est la liste
entiere qui se reconstruit.** C'est la piste a suivre.

### Hypothese testee et ECARTEE

`scrollEnabled={!(loadingMore && hasMore && atBottom)}` : ces trois valeurs
changent pendant le scroll, et modifier `scrollEnabled` pouvait reconstruire la
liste. **Fige a `true` : motif strictement identique.** Ce n'est pas la cause.

### Pistes NON encore explorees

1. **`<ShopRevealProvider expect={firstScreenUris}>` enveloppe toute la
   FlashList** (`app/(tabs)/index.tsx:521`). Il porte un etat (`ready`) et un
   `useEffect`. Tout changement de son etat re-rend le parent de la liste
   entiere. `firstScreenUris` depend de `banners` et `fastFoods`. **Suspect
   numero un** : c'est le seul parent commun a toutes les cellules detruites.
2. `renderItem` depend de `banners`, `handleBannerPress`, `loading` — `loading`
   change pendant la pagination et reconstruit `renderItem`.
3. Les rangees horizontales (`ScrollView` + `.map()`) ne virtualisent pas ; a
   traiter de toute facon, independamment du recyclage vertical.

### Methode a suivre

Instrumenter d'abord, conclure ensuite. Sur ce chantier comme sur les
precedents, **toutes les hypotheses posees sans mesure ont ete dementies** :
BlurView, nombre de menus, `scrollEnabled`. Ajouter un log de rendu sur
`HomeScreen` et sur `ShopRevealProvider` avant de toucher au code.

---

## Etat des branches

| Branche | Contenu | Utilisable ? |
|---|---|---|
| `debug/home-scroll-frein` | `windowSize={15}` + sondes | OUI — fluide, OTA-livrable |
| `feature/home-flashlist` | FlashList + corrections de structure | NON — pauses pires |

`feature/home-flashlist` n'est **pas poussee** : elle degraderait l'app en
production.

---

## Notes pratiques

- **Expo Go execute bien FlashList** (elle y est embarquee). Une premiere
  conclusion « il faut un dev build » etait fausse : l'erreur
  `ReferenceError: Property 'FlashList' doesn't exist` venait d'un test lance
  AVANT la fin de `npx expo install`.
- Les `REMONTAGE` massifs qui suivent un `/settings/app-version` + `/fastFood/all`
  sont des **Fast Refresh de Metro** apres sauvegarde, pas un bug applicatif.
- Ne jamais conclure une mesure de perf sur emulateur Android (machine hote
  saturee : 8-20 s observees, contre 165 ms max sur iPhone).
