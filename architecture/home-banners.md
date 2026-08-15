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
| `src/features/restaurants/components/HeroBanner.tsx` | rendu carrousel (FlatList horizontal paginé + dots) |
| `app/(tabs)/index.tsx` | passe `banners` + `handleBannerPress` au `HeroBanner` |

## Comportement au clic

- `type='bonus'` → on navigue vers `/(tabs)/settings?section=bonus`, ce qui ouvre
  la sheet `UserBonusSheet` (par le `useEffect` sur `section` de `settings.tsx`).
  Le `targetId` du banner correspond à l'id du bonus, mis en avant dans la sheet.
- `type='none'` → aucun action (`TouchableOpacity` désactivé).

## Fallback

S'il n'y a **aucune** bannière active (`length === 0`), `HeroBanner` retombe sur
l'ancienne bannière **statique** embarquée (`banner-shawamar.webp` + code FIRST50)
pour ne jamais laisser le home vide.

## Perfs & structure

- `HeroBanner` est `memo`isé ; `handleBannerPress` est `useCallback` stable en
  fonction de `router` ; `listHeader` est un `useMemo([banners, handleBannerPress])`.
- **Rendu Carrousel & Animation** :
  - `Animated.FlatList` gère le scroll horizontal et la pagination natif (`pagingEnabled`).
  - Espacement horizontal personnalisé entre les cartes (`bannerItemContainer` avec `paddingHorizontal`).
  - Animation au scroll : interpolation natif de `scrollX` pour effectuer un zoom (`scale: 0.90 -> 1.0 -> 0.90`) et ajuster l'opacité (`opacity: 0.8 -> 1.0 -> 0.8`) des bannières au défilement.
- **Boucle Infinie & Autoplay** :
  - **Loop infini** (`extendedBanners`) : multiplication virtuelle du tableau de bannières pour un défilement infini sans fin de liste.
  - **Autoplay** : défilement automatique toutes les 3.5 secondes.
  - **Pause sur slide manuel** (`onScrollBeginDrag`) : lorsqu'un utilisateur effectue un slide manuel, l'autoplay s'interrompt pendant 20 secondes avant de reprendre automatiquement.
- R16 : le carrousel est rendu **dans** `HeroBanner` (pas de composant carrousel
  partagé) ; `UserBonusSheet` n'est pas modifiée.
