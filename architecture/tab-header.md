# En-têtes d'onglets uniformes — `src/components/molecules/`

En-tête unique partagé par toutes les pages de `(tabs)` (notifications, boutique,
cart). Gère **une fois pour toutes** le fond orange de l'app, la safe-area, les
espacements et la structure titre / sous-titre / élément de droite.

## Composants

### `TabHeader.tsx`
En-tête générique posé en haut de chaque page d'onglet.

| Prop | Type | Description |
|---|---|---|
| `title` | string | Titre de la page (texte blanc) |
| `subtitle` | string? | Sous-titre contextuel (date, solde, nb plats…) |
| `right` | ReactNode? | Élément aligné à droite (HeaderPill / DatePill) |
| `onHeightChange` | `(h: number) => void`? | Remonte la hauteur mesurée → la page applique `paddingTop` au contenu |

- Fond : `Theme.colors.primary` (orange plein) + bordure basse fine orange.
- Safe-area via `useSafeAreaInsets`.

### `HeaderPill.tsx`
Pilule d'action dans l'en-tête (style de l'ancien « Tout marquer lu »).
Fond `rgba(255,255,255,0.2)`, texte/icône blancs sur le fond orange.

| Prop | Type |
|---|---|
| `label` | string |
| `icon` | Ionicon name |
| `onPress` | `() => void` |
| `filled` | boolean? |

### `DatePill.tsx`
Pilule de dates repliable utilisée pour filtrer les commandes par date.
Compact = N dates + `+X` ; étendu = toutes les dates. Chip sélectionné = fond
blanc + texte orange.

| Prop | Type |
|---|---|
| `options` | `DateOption[]` |
| `selected` | `string \| null` |
| `todayISO` | string |
| `onSelect` | `(iso: string \| null) => void` |
| `collapsedCount` | number? |

### `SectionSwitcher.tsx`
FAB flottant (bas-droite) qui, au clic, déploie verticalement vers le haut les
icônes des **autres** sections (animation `Animated.spring`). Taper une icône
switche de section ; re-taper le bouton principal referme.

| Prop | Type |
|---|---|
| `sections` | `{ key, icon }[]` |
| `activeKey` | string |
| `onSelect` | `(key) => void` |
| `bottom` | number |
| `right` | number? |

**Zone de sécurité** : un `Pressable` circulaire (diam. `SAFE_ZONE`) centré sur le
bouton capture tous les taps autour du FAB pour qu'un clic ne traverse PAS vers les
éléments en dessous (ex. bouton « Valider commande »). Quand le menu est ouvert, la
zone s'étend en capsule vers le haut pour couvrir la colonne d'icônes déployées.
`hitSlop` sur chaque icône pour des cibles plus tolérantes.

## Intégration par page

- **notifications.tsx** : `TabHeader` + `HeaderPill` (« Tout marquer lu »).
- **boutique.tsx** : `TabHeader` (titre = section active) + `DatePill`/`HeaderPill`
  selon la section + `SectionSwitcher` (Boutique / Portefeuille / Mes plats).
- **cart.tsx** : `TabHeader` (Panier / Commandes / Portefeuille) + `SectionSwitcher`.

> L'état date des panels marchands/clients est **remonté** au `TabHeader` (voir
> [orders-merchant.md](./orders-merchant.md)) : les panels ne rendent plus leur
> propre ligne de dates.
