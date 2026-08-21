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
├── hooks/useFastFoods.ts           # Wrapper context (filtre « boutique sans plat »)
├── utils/prefetchHomeImages.ts     # Préchargement séquentiel des images
├── utils/deliveryUtils.ts
└── components/
    ├── DesignRouter.tsx            # Aiguille vers Design1..7 selon `designIndex`
    ├── HeroBanner.tsx              # Carrousel de bannières (+ BannerImage)
    ├── RestaurantHeader.tsx        # En-tête home (recherche, catégories)
    ├── RestaurantCard.tsx · CategoryList.tsx · MerchantHeader.tsx
    └── designs/
        ├── DesignItem.tsx          # UNE carte menu, 7 variantes + squelette
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
| `hasLoadedOnce` | ⚠️ **Pilote la révélation de `(tabs)`** — voir [structure.md](./structure.md). Ne pas casser. |
| `searchQuery` · `selectedCategory` | Filtres (recherche serveur ; catégorie inactive). |
| `appleReviewMode` · `banners` | Portés par la réponse. |
| `upsert*FromSocket` · `applyDeliveryOffer` · `clearDeliveryOfferForBonus` | Injection socket, sans refetch. |

### Garde-fous

- **`runIdRef`** : une réponse dont le numéro n'est plus le dernier est ignorée.
  Sans ça, une recherche lente écraserait une frappe plus récente.
- **Dédup par id** au `loadMore` : un `newFastfood` reçu par socket pendant le
  chargement peut avoir déjà inséré une boutique de cette page.
- **`upsertFastFoodFromSocket` insère en TÊTE** (`[normalized, ...prev]`).
  L'ajout en fin plaçait la boutique au milieu d'une liste paginée, à un endroit
  arbitraire, et elle disparaissait au refresh suivant.
- **Écran de chargement plein** : gardé par `!searchQuery`. Une recherche sans
  résultat vide la liste ; sans cette garde l'écran plein masquerait la barre de
  recherche, empêchant l'utilisateur de corriger sa saisie.

---

## Images

`prefetchHomeImages(fastFoods, banners)` précharge dans l'ordre d'affichage :
bannières d'abord, puis boutique par boutique, **un seul lot en vol** (3 images
en parallèle au sein d'une boutique). Il est **rappelé à chaque page** — sinon
seule la première profiterait du préchargement.

Chaque `DesignItem` monte par ailleurs son `<Image>` **dès le premier rendu**,
caché derrière le squelette. Auparavant il attendait la fin d'un
`Image.prefetch` puis un re-render : les cartes accusaient un retard visible sur
la bannière, qui monte son image directement.

Les images sont servies en WebP par le backend (`thumbnailUrl.js`), dimensions
d'origine conservées.

---

## Points d'attention

- **`designIndex`** est calculé à l'index dans la liste (`index % 6`). Une
  boutique insérée par socket prend `0` (position de tête).
- **N+1 menus** : `getFastFoodsService` charge les menus **par boutique**. La
  pagination le ramène de 501 à 11 requêtes — acceptable. À revoir sur mesures.
- **Rétrocompatibilité** vérifiée dans les deux sens : ancien front / nouveau
  back (pas de `limit` → catalogue complet) et nouveau front / ancien back
  (pas de `nextCursor` → `hasMore` false, pas de `loadMore`).
