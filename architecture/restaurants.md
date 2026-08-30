# Restaurants — home client (liste des boutiques)

Feature du **home** : liste paginée des boutiques, chacune rendue par un design
tournant, plus le carrousel de bannières.

> Bannières : voir [home-banners.md](./home-banners.md).
> Events socket : voir [socket-events-client.md](./socket-events-client.md).

---

## Fichiers

```
src/features/restaurants/
├── context/FastFoodContext.tsx     # État + fetch paginé + injection socket
├── context/ShopRevealContext.tsx   # Révélation groupée d'UNE boutique (+ revealAnim)
├── hooks/useFastFoods.ts           # Wrapper context (filtre « boutique sans plat »)
├── hooks/useBannerLoop.ts          # Boucle infinie du carrousel (clones, téléport, autoplay, scrollX)
├── utils/deliveryUtils.ts
└── components/
    ├── DesignRouter.tsx            # Aiguille vers Design1..7 + ShopRevealProvider
    ├── HeroBanner.tsx              # Carrousel de bannières (+ BannerImage)
    ├── RestaurantHeader.tsx        # En-tête home (recherche, catégories)
    ├── RestaurantCard.tsx · CategoryList.tsx · MerchantHeader.tsx
    └── designs/
        ├── DesignItem.tsx          # Enveloppe (squelette + fondu) + DesignItemCard (7 variantes)
        └── Design1..7.tsx          # Rangées horizontales par boutique
```

Écran : [`app/(tabs)/index.tsx`](../app/(tabs)/index.tsx).

---

## Pagination (objectif 500 boutiques)

Le home chargeait **tout** le catalogue en un appel. À 500 boutiques c'est
plusieurs Mo de JSON avant le premier pixel, et 501 requêtes SQL côté backend.

### Contrat backend

`GET /fastFood/all` — pagination **opt-in** :

| Paramètre | Effet |
|---|---|
| *(aucun)* | Catalogue complet, réponse `data: []`. **Comportement historique conservé** — les apps déjà installées en dépendent. |
| `limit` | Active la pagination (plafonné à 50). Ajoute `nextCursor` à la réponse. |
| `cursor` | Page suivante. Sa **présence** signifie « pas la première page » → `banners: []`. |
| `q` | Recherche par nom, résolue en base. |

`nextCursor: null` = fin de liste.

### Pourquoi un curseur et pas `?page=2`

Avec un offset, créer une boutique décale toutes les suivantes : la page 2
renverrait un élément déjà affiché, ou en **sauterait** un définitivement. Le
curseur dit « ce qui suit CET élément-là » — insensible aux insertions.

Le curseur encode `(created_at, id)` en base64url. `id` est indispensable :
sans lui, deux boutiques créées à la même seconde rendraient le curseur ambigu.

### Tri

`created_at DESC, id DESC`. Conséquence voulue : **une nouvelle boutique arrive
toujours en tête, jamais au milieu** — rien ne se décale sous les yeux de
l'utilisateur pendant qu'il lit.

> ⚠️ `repos.fastfoods.getAll()` n'avait **aucun `ORDER BY`** : l'ordre venait de
> Postgres, non garanti stable. Un curseur l'exige, d'où le tri explicite dans
> `getPage()`.

### Boutiques sans plat

Le service écarte les boutiques sans menu **après** la requête. Une page de 10
pouvait donc n'en rendre que 2 — voire 0, et le home paraissait vide alors qu'il
restait des boutiques. `getPage()` utilise donc une jointure **interne**
(`menus!inner(id)`) : la base ne rend que des boutiques affichables.

Cette jointure produit une ligne par menu ; le repo déduplique par id **avant**
de découper la page, sinon `limit` compterait des menus, pas des boutiques.

---

## Recherche — SERVEUR, pas locale

`searchQuery` déclenche un fetch debouncé (350 ms) avec `?q=`, qui repart de la
première page.

> ⚠️ Le filtre par nom a été **retiré** de `useFastFoods`. Filtrer localement ne
> verrait que les pages déjà chargées : une boutique du fond du catalogue serait
> introuvable alors qu'elle existe. Régression silencieuse — c'est le piège
> principal de ce chantier.

`useFastFoods` ne garde qu'un filtre : les boutiques **sans plat**, pour celles
arrivées par socket dont le payload peut ne pas porter de menus.

`selectedCategory` est stocké et passé au header mais **ne filtre rien** — le
câblage serveur est prévu, l'implémentation viendra avec les vraies catégories.

---

## FastFoodContext — API

| Clé | Rôle |
|---|---|
| `fastFoods` | Boutiques chargées (pages cumulées). |
| `loading` | Première page / refresh / recherche. |
| `loadingMore` | Page suivante uniquement. |
| `hasMore` | `false` quand tout est chargé. |
| `loadMore()` | Page suivante. Sans effet si déjà en cours ou fin atteinte. |
| `refresh()` | Repart de la première page (pull-to-refresh). |
| `resetToFirstPage()` | Tronque la liste à la première page, **sans requête**. Appelé au retour en haut du home. Éteint aussi `loadingMore` et invalide la page en vol. |
| `notifyUserScroll()` | Signale un scroll réel : lève le verrou posé par la troncature. Appelé par l'écran sur `onScroll`. |
| `cancelPendingLoadMore()` | Invalide une page en vol **sans tronquer**. Appelé au début d'une remontée. |
| `hasLoadedOnce` | ⚠️ **Pilote la révélation de `(tabs)`** — voir [structure.md](./structure.md). Ne pas casser. |
| `searchQuery` · `selectedCategory` | Filtres (recherche serveur ; catégorie inactive). |
| `appleReviewMode` · `banners` | Portés par la réponse. |
| `upsert*FromSocket` · `applyDeliveryOffer` · `clearDeliveryOfferForBonus` | Injection socket, sans refetch. |

### Garde-fous

- **`runIdRef`** : une réponse dont le numéro n'est plus le dernier est ignorée.
  Sans ça, une recherche lente écraserait une frappe plus récente.
- **`resetLockRef` — verrou levé au GESTE, pas au chrono.** Après un
  `resetToFirstPage()`, la liste raccourcit : sa fin remonte sous le viewport et
  `onEndReached` repart **tout seul**, sans geste de l'utilisateur. C'est cette
  demande-là qu'il faut refuser, sinon on recharge la page qu'on vient de retirer
  → on retronque : **boucle de pagination infinie**, ~120 ms le tour. Le verrou
  tombe au premier `onScroll` réel (`notifyUserScroll`, appelé par l'écran).

  > ⚠️ C'était un **cooldown de 800 ms** (`RESET_COOLDOWN_MS`), avec report de la
  > demande refusée (`deferredLoadRef`). Un délai fixe est une devinette : il
  > refusait aussi les demandes **légitimes**. Avec `PAGE_SIZE = 3`, le bas de
  > liste est atteint en ~300 ms, donc quasi toujours dans la fenêtre. Ne pas
  > réintroduire de délai : on distingue le rebond automatique du geste réel.

- **Effets de bord HORS de l'updater `setFastFoods`.** ⚠️ `resetToFirstPage()`
  posait son verrou, son curseur et son `clearTimeout` **à l'intérieur** de
  l'updater. Un updater n'est pas garanti exécuté une seule fois : React le
  rejoue (StrictMode, rendu concurrent, re-rendu déclenché par un contexte
  voisin — fréquent sur ce home, cf. « références stables »). Une simple
  notification entrante reposait donc le verrou **après coup** et gelait la
  pagination : le loader restait figé et la page suivante n'arrivait jamais.
  L'updater doit rester **pur** ; la garde de longueur se lit via
  `fastFoodsLenRef`.

- **`resetSeqRef` — invalidation des réponses en vol.** `resetToFirstPage()`
  n'annule pas un `loadMore` déjà parti. Sa réponse arrivait après la troncature
  et concaténait sa page aux boutiques conservées : on **ré-ajoutait exactement
  ce qu'on venait de retirer**, et `cursorRef` (remis à la fin de la première
  page) était écrasé par le curseur de cette réponse. Chaque reset incrémente
  donc un compteur, capturé au départ de la requête et comparé à l'arrivée
  **avant toute écriture**. Un enchaînement rapide haut/bas incrémente autant de
  fois : toute réponse antérieure au dernier reset est écartée.

- **Le loader s'éteint au reset, pas à la réponse.** `resetToFirstPage()` fait
  `setLoadingMore(false)` immédiatement — sinon le spinner restait animé en bas
  d'une liste qu'on vient de tronquer, alors que plus rien ne sera ajouté. En
  contrepartie, une réponse devenue caduque ne touche **plus** à `loadingMore`
  dans son `finally` : un `loadMore` légitime a pu repartir depuis, et l'éteindre
  masquerait *ce* chargement-là.

- **`cancelPendingLoadMore()` — invalider dès le DÉBUT de la remontée.** ⚠️ Le
  reset seul est trop tardif : sur le tap Home il n'intervient qu'après les
  450 ms d'animation. Une page en vol arrivait **pendant** la remontée et faisait
  monter ses cellules (~100 ms de commit natif chacune, voir « Performance du
  montage »), bloquant le thread JS au moment précis où l'animation de scroll
  doit tourner — d'où la pause et le saut ressentis. L'écran appelle donc cette
  fonction **avant** `scrollToOffset`, et au scroll manuel dès une remontée de
  plus de 24 px (`lastOffsetRef`). Contrepartie assumée : un simple recul de
  l'utilisateur sacrifie la requête en cours, qui repartira à la redescente.
- **`firstPageCursorRef`** : curseur rendu par la première page, conservé pour
  que `resetToFirstPage()` reparte exactement de sa fin — sinon `loadMore`
  rechargerait des boutiques déjà affichées.
- **Dédup par id** au `loadMore` : un `newFastfood` reçu par socket pendant le
  chargement peut avoir déjà inséré une boutique de cette page.
- **`upsertFastFoodFromSocket` insère en TÊTE** (`[normalized, ...prev]`).
  L'ajout en fin plaçait la boutique au milieu d'une liste paginée, à un endroit
  arbitraire, et elle disparaissait au refresh suivant.
- **Écran de chargement plein** : gardé par `!searchQuery`. Une recherche sans
  résultat vide la liste ; sans cette garde l'écran plein masquerait la barre de
  recherche, empêchant l'utilisateur de corriger sa saisie.
- **Écran d'erreur réseau** (`error && !fastFoods.length && !loading`) : remplace
  TOUTE la page par un message centré + bouton « Réessayer » (`refresh`). Ni
  header ni liste : il n'y a aucune donnée à montrer, et un contenu partiel
  donnerait l'impression d'une page cassée plutôt que d'un réseau indisponible.
  ⚠️ L'ancienne bannière promo statique (« Get 50% Off ») a été **supprimée** :
  image locale donc peinte instantanément, elle s'affichait avant les vraies
  bannières — un clignotement à chaque ouverture du home. Sans bannière,
  `HeroBanner` ne rend plus rien.

---

## Images

**Pas de préchargement.** `prefetchHomeImages` a été supprimé : il dupliquait le
chargement déjà fait par les cartes, qui montent leur `<Image>` **dès le premier
rendu**, caché derrière le squelette. Une version antérieure attendait la fin
d'un `Image.prefetch` puis un re-render : les cartes accusaient un retard visible
sur la bannière, qui monte son image directement.

### Révélation groupée par boutique

`ShopRevealContext` — un `ShopRevealProvider` **par boutique**, posé par
`DesignRouter`. Le `MerchantHeader` et tous les `DesignItem` de la rangée
s'inscrivent (`register(uri)`) puis signalent (`resolve(uri)`), et lisent le même
`ready` : la boutique se révèle **d'un bloc**.

- ⚠️ Sans lui, chaque carte levait son squelette dès que **son** image arrivait :
  la rangée se remplissait carte par carte, et l'avatar du header sortait encore
  à un autre moment — la boutique apparaissait en morceaux.
- **Inscription pendant le rendu**, pas dans un effet : les effets s'exécutent
  après le rendu initial, donc après la fermeture de la fenêtre d'inscription.
- **Fenêtre d'inscription** (`sealedRef`) : sans elle, le premier `onLoad` arrivé
  avant l'inscription des cartes suivantes trouvait un set vide et révélait la
  boutique alors que des images étaient encore en route.
- **Comptage par URL** : une même URL sur deux cartes ne doit être attendue
  qu'une fois. Garde-fou `MAX_WAIT_MS` (8 s) contre une image qui ne répond ni
  par `onLoad` ni par `onError`.
- Hors provider, `useShopReveal()` renvoie `null` et chaque composant retombe sur
  son chargement individuel (même mécanique, groupe d'un seul membre).

### Synchro au pixel — `revealAnim`

`ready` fait basculer tout le groupe dans le **même rendu React**, mais pas à la
**même frame peinte** : l'avatar, chaque carte et leurs images sont des instances
natives distinctes, chacune avec son propre passage de composition. `onLoad`
d'expo-image dit « décodée », pas « affichée ». D'où un décalage résiduel de
quelques frames — invisible à l'œil nu, net au ralenti, et différent à chaque
ouverture.

> ⚠️ Deux approches ont été essayées et **retirées** parce qu'elles restaient
> probabilistes : un `requestAnimationFrame` par composant (callbacks
> indépendants, aucune raison de tomber ensemble) puis un délai fixe deviné
> (`SETTLE_MS`) avant la bascule. Ne pas les réintroduire.

Le contexte expose donc **`revealAnim`**, une `Animated.Value` unique par
boutique, jouée sur le **driver natif**. Une frame d'animation met à jour toutes
les vues qui y sont liées dans la même opération du thread UI : l'opacité de
l'avatar et celle de chaque carte sont rigoureusement égales à chaque frame,
quel que soit l'instant où leur bitmap a fini de compositer. On ne synchronise
plus des événements, on partage un état.

Le squelette et le contenu réel sont montés **ensemble** le temps du fondu et se
croisent sur cette valeur (contenu `0 → 1`, squelette `1 → 0` par interpolation) :
aucun trou entre les deux. Le squelette est démonté après `REVEAL_MS` — son
animation de respiration tourne en boucle et n'a pas à survivre sous une carte
opaque.

`DesignItem` est scindé en deux : **`DesignItemCard`** (les 7 variantes de
design, qui ne connaissent rien du chargement) et **`DesignItem`**, l'enveloppe
qui porte squelette, `register`/`resolve` et fondu. C'est ce qui permet
d'envelopper les 7 variantes d'un coup au lieu de répéter la logique à chaque
retour.

### RÈGLE CENTRALE — monter le contenu AVANT le fondu, jamais au fondu

**Toute vue du groupe doit monter ses `<Image>` dès le PREMIER rendu, cachée
sous le squelette. Jamais derrière un `if (!ready) return <squelette>`.**

C'est la cause du dernier décalage, celui qui a résisté le plus longtemps, et la
seule règle à retenir si on retouche ce code.

Une opacité partagée ne suffit pas si les contenus ne sont pas dans le **même
état de préparation** quand le fondu démarre :

| | Image montée | Au démarrage du fondu |
|---|---|---|
| Bannière | dès le 1er rendu, opacité 0 | pixel déjà décodé et composité → apparaît **instantanément** |
| Cartes / avatar *(ancien code)* | seulement quand `ready` passe à vrai | doivent encore décoder puis compositer → **quelques frames de retard** |

Résultat : `revealAnim` était rigoureusement synchrone, les logs le prouvaient
(`SEAL pending=3` → 3 × `-res` → `READY`), et pourtant la bannière sortait
visiblement avant. Ce n'était pas l'animation qui décalait, c'était le contenu
qui n'était pas prêt à être peint.

> ⚠️ Le retour anticipé sur squelette paraît plus propre et plus économe — c'est
> un piège. Il déplace le montage des images au pire moment possible : celui où
> elles doivent déjà être visibles. **Ne pas le réintroduire** dans `DesignItem`
> ni dans `MerchantHeader`.

Corollaire : le squelette est un **calque au-dessus** du contenu réel, pas un
remplacement de celui-ci. Il porte l'image témoin qui signale le chargement au
groupe (même URL que la carte dessous — expo-image dédoublonne la requête).

#### Historique des tentatives ratées (ne pas refaire)

| Tentative | Pourquoi ça ne marchait pas |
|---|---|
| `requestAnimationFrame` par composant | Callbacks indépendants, aucune raison de tomber sur la même frame. |
| Délai fixe deviné (`SETTLE_MS`) avant la bascule | On parie sur la durée de composition ; ça reste probabiliste. |
| Provider d'écran incluant **2 boutiques** + bannière | La boutique 0 attendait aussi les images de la boutique 1 → latence réelle à l'arrivée sur le home. |
| Inscription des membres pendant le rendu, sans `expect` | Sous `FlatList`, le header monte dans un commit et les cellules dans le suivant : le groupe se scellait sur la seule bannière. |

**La méthode qui a trouvé la cause** : instrumenter le provider
(`SEED` / `SEAL` / `register` / `resolve` / `READY`) et lire les logs. Les
hypothèses successives ont toutes échoué ; les logs ont montré en une fois que
le groupe était correct et que le problème était ailleurs. À refaire d'emblée
en cas de nouveau symptôme de ce type.

### Bannière + boutique 0 — un groupe, déclaré à l'avance

La home pose un `ShopRevealProvider` autour de la FlatList. Y sont réunies
**la bannière et la première boutique uniquement** : `DesignRouter` n'ouvre pas
de provider pour `index === 0`, elle hérite de celui-ci.

> ⚠️ **UNE SEULE boutique dans ce groupe, jamais deux.** Avec deux, la boutique 0
> devait aussi attendre les images de la boutique 1 — c'est ce qui avait rajouté
> de la latence à l'arrivée sur le home. Ici la boutique 0 n'attend rien de plus
> qu'avant ; seule la bannière patiente, le temps de sortir avec elle.

**`expect` — la pré-inscription, et pourquoi elle est indispensable.** La home
passe au provider la liste des URLs à attendre (bannière + avatar + menus de la
boutique 0), calculée depuis les données.

> ⚠️ Sans elle, la bannière sortait **toujours en premier**. Une `FlatList` monte
> son `ListHeaderComponent` dans un commit et ses cellules dans le suivant : le
> groupe se scellait en ne connaissant que la bannière, elle se résolvait, le
> groupe partait — et la boutique 0 s'inscrivait trop tard (`register`
> court-circuité par `readyRef`). L'inscription pendant le rendu ne suffit que
> si provider et membres sont rendus **dans le même commit** — ce qui est le cas
> des providers par boutique de `DesignRouter`, pas de celui-ci.

Côté bannière, il ne reste qu'un fondu :

> ⚠️ Elle cumulait **deux fondus concurrents** : le `transition={180}` interne
> d'expo-image (non pilotable) et le `fadeOut`/`onFadedOut` du `CardSkeleton`
> (~260 ms, un `Animated` séparé). Deux timelines de durées et de départs
> différents ne peuvent pas se croiser proprement. Le `transition` a été retiré ;
> image, voile et puces suivent la valeur du groupe.

Les puces sont superposées en deux couches (`dotsLayer`, absolues) dans un
`dotsRow` de **hauteur fixe** : elles se croisent sans faire bouger la ligne.

### Squelette de la bannière

Il est monté **hors de la FlatList** du carrousel (`carouselOverlay`, une `View`
en absolu au-dessus). ⚠️ Il vivait dans les items : il n'était donc peint
qu'après le positionnement de la liste sur `initialScrollIndex` (index 15) — il
arrivait visiblement en retard alors que les cartes étaient déjà là.

Côté home, la FlatList fixe `initialNumToRender={2}` : par défaut (10) la
première passe montait la bannière **et** dix boutiques, et le squelette de la
bannière n'était peint qu'à la fin de cette passe.

Les images sont servies en WebP par le backend (`thumbnailUrl.js`), dimensions
d'origine conservées.

---

## Retour en haut — bouton Home et scroll manuel

Deux déclencheurs, même effet : remontée puis **troncature à la première page**
(`resetToFirstPage`), pour ne pas garder des dizaines de cellules montées.

- **Tap sur l'onglet Home** : écouteur `tabPress`, posé **dans l'écran** et non
  dans `(tabs)/_layout.tsx` — ce layout est partagé par les 5 onglets et n'a pas
  accès à la liste. Garde `isFocused()` : sans elle, taper Home depuis un autre
  onglet remonterait la liste pendant la navigation entrante.
- **Scroll manuel** : `onMomentumScrollEnd`, jamais `onScroll` — retirer des
  cellules pendant que la liste défile la ferait sauter.

> ⚠️ **`atTopRef` est obligatoire avant toute troncature.** Tronquer sans savoir
> où l'on se trouve fait remonter le bas de liste sous le viewport et déclenche
> `onEndReached` → boucle de pagination (voir `RESET_COOLDOWN_MS`). Un simple
> `setTimeout` ne suffit pas : il a été essayé et il créait la boucle.

Le pied de liste et `onEndReached` ont été **testés et mis hors de cause** dans
la boucle mount/unmount de la dernière cellule.

## Performance de la liste — références stables (OBLIGATOIRE)

Le home se re-rend à **chaque agitation des contextes voisins** (notifications,
auth, socket). Si quoi que ce soit d'instable descend jusqu'à la `FlatList`,
elle reconstruit toutes ses cellules visibles — des cartes lourdes (`BlurView`,
`LinearGradient`, `Svg`, ombres) — et bloque le thread JS **70 à 190 ms**. C'est
la micro-saccade ressentie au scroll.

Quatre sources ont été trouvées et corrigées ; **aucune ne doit revenir** :

| Fichier | À ne jamais refaire | Correctif en place |
|---|---|---|
| `FastFoodContext` | `value={{ ... }}` littéral | `useMemo` sur la `value` |
| `useFastFoods` | `.filter()` + `{...context}` dans le corps du hook | `useMemo` sur les deux |
| `app/(tabs)/index.tsx` | `renderItem` / `keyExtractor` inline | `useCallback`, plus `handleMenuClickRef` pour figer le handler |
| `DesignRouter` | pas de `memo` ; tableau des 6 variantes JSX instanciées | `React.memo` ; on sélectionne le **composant**, pas l'élément |

> ⚠️ `keyExtractor` ne doit **jamais** retomber sur l'index nu : une insertion en
> tête (socket) décalerait toutes les clés et remonterait la liste entière.
> Préfixe explicite : `item.id ?? \`idx-${index}\``.

**Symptôme à reconnaître** : des `re-rendu #N (xN)` qui s'incrémentent sur des
cellules **immobiles**, par vagues synchronisées sur toutes les cellules à la
fois. Vagues simultanées = c'est le parent qui se re-rend, pas les cellules.

### Performance du montage — MESURÉ, ne pas refaire

Les sondes de diagnostic (`[CELL]`, `[JS] blocage`, `[END]`, `DISABLE_FOOTER`)
ont été **retirées** une fois la mesure faite. Résultats sur appareil réel
(iPhone), stables sur plusieurs cycles :

| Cellule | `render` (JS) | `commit` (natif) |
|---|---|---|
| #3 (1re du lot) | 0 ms | 104-109 ms |
| #4 | 0 ms | 67-72 ms |
| #5 | 0 ms | 43-48 ms |

**Conclusions, chiffrées :**

- `render = 0 ms` partout : le JavaScript ne coûte rien. Tout le temps part
  dans le **commit** (création des vues natives). Alléger le JS des cartes
  n'apporterait donc rien.
- Le coût **décroît dans un même lot** (109 → 72 → 48), reproductible à
  l'identique sur iOS et Android : le premier montage paie un amorçage amorti
  par les suivants.
- **Aucun lien avec le nombre de menus** : 1 menu = 81 ms, 5 menus = 50 ms.
  Limiter les cartes rendues par `menu.map()` ne servirait à rien.
- Un blocage JS de ~150 ms par page, pendant que le loader est affiché.
  Acceptable — pas d'optimisation retenue.

**Pistes testées et écartées** (ne pas y revenir sans nouvelle mesure) :
`windowSize` élargi à 11 + `removeClippedSubviews` + `updateCellsBatchingPeriod`
(aucun effet), BlurView (`disableAndroidBlur` est déjà actif sur Android),
nombre de menus par boutique.

> ⚠️ Les blocages de 8 à 20 s observés sur émulateur Android venaient de la
> machine hôte saturée, pas du code : sur iPhone, le même parcours ne dépasse
> jamais 165 ms. **Ne jamais conclure une mesure de perf sur émulateur.**

> ⚠️ Une mesure de durée par `Date.now()` capturé au rendu et relu dans un
> `useEffect` donne des valeurs **fausses** (on a vu « 42909 ms ») : l'effet
> s'exécute bien après le rendu.

**La méthode** : instrumenter et lire les logs. Sur ce chantier, les hypothèses
successives (coût des cartes, virtualisation, footer, `onEndReached`) ont toutes
été démenties par la mesure. Instrumenter d'abord.

## Points d'attention

- **`designIndex`** est calculé à l'index dans la liste (`index % 6`). Une
  boutique insérée par socket prend `0` (position de tête).
- **N+1 menus** : `getFastFoodsService` charge les menus **par boutique**. La
  pagination le ramène de 501 à 11 requêtes — acceptable. À revoir sur mesures.
- **Rétrocompatibilité** vérifiée dans les deux sens : ancien front / nouveau
  back (pas de `limit` → catalogue complet) et nouveau front / ancien back
  (pas de `nextCursor` → `hasMore` false, pas de `loadMore`).
