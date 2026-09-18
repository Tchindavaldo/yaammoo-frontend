# Banners home — Carrousel publicitaire (frontend)

## Rôle

La bannière publicitaire du home (`HeroBanner`) est un **carrousel horizontal**
dynamique. Les images viennent du backend via `GET /fastfood/all`
(`data.banners`), pas d'asset local.

## Flux de données

`GET /fastfood/all` renvoie désormais `{ data, banners, appleReviewMode }`.
`FastFoodContext.fetchFastFoods` lit `response.data.banners` et le stocke dans un
state `banners: AppBanner[]` (défaut `[]` si absent). Il est exposé via
`useFastFoods()` comme le reste du contexte.

| Fichier | Rôle |
|---|---|
| `src/types/index.ts` | `interface AppBanner { id, title, imageUrl, type: 'bonus'\|'none', targetId, active, sortOrder }` |
| `src/features/restaurants/context/FastFoodContext.tsx` | state `banners` + lecture depuis `/fastfood/all` |
| `src/features/restaurants/components/HeroBanner.tsx` | rendu carrousel (`Animated.ScrollView` horizontale paginée + puces) |
| `src/features/restaurants/hooks/useBannerLoop.ts` | mécanique de la boucle infinie : diapos + clones, téléport, autoplay, `scrollX` |
| `app/(tabs)/index.tsx` | passe `banners` + `handleBannerPress` au `HeroBanner` |

## Comportement au clic

- `type='bonus'` → on navigue vers `/(tabs)/settings?section=bonus`, ce qui ouvre
  la sheet `UserBonusSheet` (par le `useEffect` sur `section` de `settings.tsx`).
  Le `targetId` du banner correspond à l'id du bonus, mis en avant dans la sheet.
- `type='none'` → aucun action (`TouchableOpacity` désactivé).

## Absence de bannière

Il n'y a **plus** de bannière statique de secours. Elle était locale, donc peinte
instantanément, et s'insérait avant les vraies bannières — d'où un clignotement à
chaque ouverture du home. Aujourd'hui :

- chargement en cours et aucune bannière reçue → **squelette** ;
- aucune bannière du tout → `HeroBanner` ne rend **rien**, l'échec de chargement
  étant traité par la home (écran d'erreur centré).

## Puces de pagination

Réactivées (`DOTS_ENABLED = true`). Elles sont posées **dans** le carrousel, en
bas de la bannière : pastille sombre arrondie (`rgba(0,0,0,0.85)`, `borderRadius`)
centrée en `position: absolute`, au lieu d'une rangée sous le carrousel.

Contraintes à ne pas casser :

- Elles sont pilotées par `scrollX` sur le **driver natif**, jamais par un
  `useState` : tout `setState` ici re-rend les N + 2 diapos et leurs
  interpolations, ce qui provoquait la pause au scroll du home.
- Seule l'**opacité** est animée (largeur et couleur ne sont pas gérées par le
  driver natif) : la puce active est un calque superposé sur un emplacement de
  largeur fixe (`dotSlot`).
- Une puce s'active sur **deux** positions quand la boucle est active (la diapo
  réelle et son clone).
- La pastille garde `height` fixe + `overflow: 'hidden'` : les couches squelette
  et réelle se superposent pendant le fondu croisé et ne doivent pas déborder.

⚠️ Historique : la simple présence des puces a longtemps ramené une pause au
scroll du home (cause jamais identifiée). Repasser `DOTS_ENABLED` à `false` si
elle réapparaît.

## Perfs & structure

- `HeroBanner` est `memo`isé ; `handleBannerPress` est `useCallback` stable en
  fonction de `router` ; `listHeader` est un `useMemo([banners, handleBannerPress])`.
- **Rendu Carrousel & Animation** :
  - `Animated.ScrollView` (et non `FlatList`) gère le scroll horizontal et la
    pagination native (`pagingEnabled`). À N + 2 diapos il n'y a rien à
    virtualiser, et cela retire du header toute la mécanique `VirtualizedList`
    (fenêtre de rendu, viewabilité, cascade de montage).
  - Espacement horizontal personnalisé entre les cartes (`bannerItemContainer` avec `paddingHorizontal`).
  - Animation au scroll : interpolation natif de `scrollX` pour effectuer un zoom (`scale: 0.90 -> 1.0 -> 0.90`) et ajuster l'opacité (`opacity: 0.8 -> 1.0 -> 0.8`) des bannières au défilement.
- **Boucle Infinie & Autoplay** :
  - **Loop infini** (`useBannerLoop`) : N + 2 diapos (un clone de queue en tête,
    un clone de tête en queue) et un téléport silencieux aux extrémités.
  - **Autoplay** : défilement automatique toutes les 3.5 secondes.
  - **Pause sur slide manuel** (`onScrollBeginDrag`) : lorsqu'un utilisateur effectue un slide manuel, l'autoplay s'interrompt pendant 20 secondes avant de reprendre automatiquement.
- R16 : le carrousel est rendu **dans** `HeroBanner` (pas de composant carrousel
  partagé) ; `UserBonusSheet` n'est pas modifiée.

## Skeleton de chargement

`CardSkeleton` (`src/components/CardSkeleton.tsx`) couvre **toute la carte**,
pas seulement l'image : un fondu de couleur entre `#e6eaef` et `#f4f7fa`
(800 ms par sens, aucun deplacement).

Deux regles apprises en corrigeant le rendu :

1. **Plein carte, jamais autour de la seule image.** Habiller l'image laissait
   voir le chrome du design autour du voile — liseres, bandeau haut, fonds de
   blocs — donc un rendu different d'un design a l'autre.
2. **A la place de la carte, jamais par-dessus.** Superpose en dernier enfant,
   les elements en `position: absolute` (badges, blurs, prix) passaient
   au-dessus : on voyait la carte ET le squelette en meme temps. `DesignItem`
   fait donc un **retour anticipe** avec le squelette seul, dimensionne par
   `SKELETON_SIZES[variant]` pour occuper exactement la place de la carte
   finale (sinon la rangee horizontale saute au chargement).

Comme l'image n'est pas montee pendant le squelette, `onLoad` ne partirait
jamais : `DesignItem` fait un `Image.prefetch` et bascule quand le cache tient
l'URL. `HeroBanner` monte l'image en meme temps et peut donc utiliser `onLoad`.

`FORCE_SKELETON` (dans `DesignItem` et `HeroBanner`) fige le squelette pour
inspecter son rendu sans dependre du reseau.

## Performances de chargement

- **Prefetch sequentiel dans l'ordre d'affichage**
  (`src/features/restaurants/utils/prefetchHomeImages.ts`), appele des que
  `/fastfood/all` repond : bannieres, puis **une boutique a la fois**, en
  suivant l'ordre du tableau `fastFoods` — qui est exactement l'ordre de rendu
  de la FlatList.

  Deux regles :
  1. **Un seul lot en vol.** La boutique suivante n'est attaquee qu'une fois la
     precedente terminee. Sans ca les requetes s'accumulent et on retombe sur un
     telechargement massif (~24 Mo) pour des images que l'utilisateur ne verra
     peut-etre jamais, en retardant celles qu'il a sous les yeux.
  2. **Pas d'observation du scroll.** L'ordre est deja connu par l'index du
     tableau ; une file sequentielle suit la descente sans avoir a suivre la
     position de scroll.

  3 images en parallele a l'interieur d'une meme boutique (3 a 5 menus chacune),
  dedoublonnage par session, et un `runId` annule la file si le catalogue est
  rafraichi entre-temps.
- **`cachePolicy="memory-disk"`** sur toutes les images distantes : elles
  survivent au redemarrage de l'app.
- **`transition={180}`** : fondu court a l'apparition au lieu d'un « pop ».
