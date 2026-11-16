# Feature — Gestion des menus (côté marchand)

## Rôle
Interface marchand pour créer, modifier et consulter les menus de sa boutique
(Settings → « Gestion menu »). Voir [`orders-merchant.md`](./orders-merchant.md) pour
la gestion des **commandes** (feature distincte, même dossier `merchant/`).

---

## Arborescence des fichiers

```
yaammoo/src/features/merchant/components/
├── MenuManagePanel.tsx             # Panel gestion des menus (stats + chips filtres Dispo/Indispo + bouton Ajouter ; item calqué sur MerchantOrderCard ; vue ajout inline)
├── AddMenuSheet.tsx                # Sheet ajout menu (simple)
├── AddMenuSheetMultiStep.tsx       # Formulaire menu (Modal pour modif / inline `embedded` pour création) — 4 étapes, orchestration
├── menu-form/                      # Modules du formulaire (découpe R4)
│   ├── AddMenuSheet.styles.ts      # Styles du formulaire et de ses étapes
│   ├── menuFormConstants.ts        # MODAL_HEIGHT, DESC_MIN/MAX
│   ├── useMenuImageUpload.ts       # Sélection galerie + upload `/image/upload` (progression par slot)
│   ├── MenuNameCategoryStep.tsx    # Étape 1 : nom + catégorie (+ suggestions)
│   ├── validateMenuStep.ts         # Contrôle de l'étape courante (`MenuStep`)
│   ├── MenuPricesEditor.tsx        # N prix : onglets « Prix 1 * / Prix 2 / … » + « + » / poubelle
│   ├── MenuPhotoSlots.tsx          # Les 3 emplacements photo
│   ├── MenuExtrasEditor.tsx        # Extras (chips + ligne d'édition)
│   ├── MenuStockAvailability.tsx   # Disponibilité + stock
│   └── MenuFormModal.tsx           # Coque Modal (flou + sheet) + `useSheetAnimation`
├── drinks/                         # Boissons de la BOUTIQUE (route app/shop/drinks.tsx)
│   ├── useShopDrinks.ts            # GET/POST `/fastfood/:id` (`drinks`, liste complète)
│   ├── ShopDrinksPage.tsx          # Page : ajout/modif, liste, pied « Enregistrer »
│   └── ShopDrinkRow.tsx            # Ligne : prix, dispo/rupture, plats concernés (« Tous les plats » ou sélection)
├── recap-designs/                  # Étape récap
│   ├── MenuDraft.types.ts          # Type `MenuDraft` (snapshot du formulaire, `prices: DraftPrice[]`) + sélecteurs
│   ├── MenuRecap.tsx               # Rend le design retenu
│   └── MenuRecapDesign1.tsx        # Bandeau + tuiles prix (3 max, la 3e résume « +N ») + photos/extras/prix
└── MenuManageModal.tsx             # Page entière, route app/shop/menu.tsx (sans navbar), gestion menus (Settings → "Gestion menu")
```

## Boissons de la boutique (app ≥ 1.1.5)

Les boissons ne sont plus saisies dans le plat : elles appartiennent à la **boutique**
(`fastfood.drinks` côté backend). Settings → Boutique → **Boissons** (`app/shop/drinks.tsx`).
Une boisson est proposée avec **tous les plats** par défaut (`menuIds: null`) ; le marchand
peut la restreindre à certains plats. Enregistrement = liste complète via `POST /fastfood/:id`.
Côté client rien ne change : le backend reconstruit `menu.drink` à la lecture.

## Nombre de prix variable (app ≥ 1.1.5)

Un plat a **N prix** (`prices[]`, au moins un). Client : toujours lire les prix via
`src/features/checkout/utils/menuPrices.ts` (`menuPriceOptions`, `menuPriceAt`,
`menuPriceDescription`) ; `prix1..3` ne sont plus que des miroirs des 3 premiers.
`selectedPriceIndex` reste 1-based. Les apps ≤ 1.1.4 n'affichent que les 3 premiers prix.

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

> ⚠️ **Couleur du chip statut : toujours en hex, jamais `rgba(...)`.** Le chip concatène
> `statusColor + "14"` / `"22"` pour obtenir une teinte translucide (8%/13% d'opacité) — une
> valeur `rgba(...)` ne peut pas être suffixée de la sorte, React Native rendait alors un fond
> plein illisible (texte invisible) au lieu d'un fond léger. `statusColor` doit rester
> `#rrggbb`.

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

**4 étapes** (`STEPS = ['nameImage', 'prices', 'details', 'recap']`, maquettes D1→D4 du canvas
« Yaammoo — Design », page « Catégorie ») :
1. **nameImage** — nom et **catégorie** (`MenuNameCategoryStep`, chacun sur toute la ligne ;
   suggestions Poulet / Burger / Pizza qui remplissent le champ, sinon saisie libre), puis les
   3 photos (`MenuPhotoSlots`). Validation : nom, catégorie, 3 photos.
2. **prices** — **N prix en onglets** (`MenuPricesEditor` : prix pleine largeur + ✓/poubelle
   accolé, description multiligne dessous), puis `MenuPricePreviewCard`. « Suivant » vérifie
   tous les prix côté serveur.
3. **details** — **Extras** (`MenuExtrasEditor` : chips + carte d'édition nom / prix /
   Supprimer / Valider), **Disponibilité** et **Stock** (`MenuStockAvailability`).
4. **recap** — `MenuRecap` → `MenuRecapDesign1` : bandeau orange, ligne **Prix** (toujours
   3 tuiles, « — » si absent ; au-delà de 3 : 2 prix + tuile « +N »), puis ligne **Détails**.

La catégorie part dans `category` (`POST /menu`, `PUT /menu/:id`) et alimente le filtre
catégorie du home (`GET /fastfood/all?category=`, cf. restaurants.md).

   > Pour ajouter un design : créer `MenuRecapDesignN.tsx` (props `{ draft: MenuDraft }`,
   > utiliser `validPrices`/`namedItems`), puis l'enregistrer dans `MenuRecap.tsx` (entrée
   > `VARIANTS` + branche de rendu). Aucune logique de formulaire ne change.

**UX inputs** : focus = bordure orange (`focusedField`), erreur de validation = bordure rouge
(`errorFields`, nettoyée à la saisie) ; tap dans le vide ferme le clavier (`Pressable` +
`keyboardDismissMode`).

**Données** : `extra` envoyé au backend porte `name`, `prix`, `quantite`, `status` ; `drink` n'est plus envoyé.
Helper `toItem` pour (re)charger un menu existant.

**Hauteur du mode Modal** : `MODAL_HEIGHT` (px, fixe, identique sur les 4 étapes pour éviter
un saut de taille au changement d'étape) = **540** (~62% d'un écran de référence 844px).

> ⚠️ **Safe-area basse (mode Modal) : à absorber côté footer, jamais sur `sheetWrap`.**
> Un `paddingBottom: insets.bottom` posé sur `sheetWrap` (le conteneur externe, hauteur
> `MODAL_HEIGHT + insets.bottom`) pousse `sheet` (fond blanc, `flex:1`) vers le haut et laisse
> apparaître le fond gris de l'`overlay` sous le bouton "Suivant" — bug déjà rencontré. La
> safe-area doit rester absorbée à l'intérieur d'un élément à fond blanc (footer ou sheet),
> pas retranchée de la zone visible du sheet lui-même.

## Aperçu du prix (étape 2) et photos (étape 1)

- Étape 2 : sous le prix sélectionné, `MenuPricePreviewCard` (maquette B4 du canvas
  « Yaammoo — Design », page « Menu — prix ») : « Prix affiché au client », puis
  « Prix du plat », « Frais de retrait », « Vous recevez ». Données de
  `GET /menu/price-preview/:fastFoodId` via `useMenuPriceCheck`
  (`menu-form/useMenuPricePreview.ts`) ; rien n'est recalculé dans l'app. Cases
  vides (« — ») tant que le prix n'est pas vérifié.
- Vérification à la demande (`menu-form/menuPriceStepActions.ts`) :
  - bouton ✓ en fin de ligne (`?price=`) : remplit les cases ; refus = un toast ;
    une fois accepté, le ✓ devient la poubelle (prix 2+) ; modifier le montant
    le dévalide ;
  - ouverture d'un menu existant : ses prix sont vérifiés d'office (spinner
    sur les cartes) ;
  - bouton « Suivant » : seuls les prix pas encore vérifiés partent, en une
    requête (`?prices=a,b`), spinner sur le bouton seulement ; refus =
    bascule sur le premier prix refusé + un seul toast (une ligne
    « Prix N : message » par prix refusé).
- Étape 1 : les photos (`MenuPhotoSlots`, 3 requises) suivent le nom et la
  catégorie ; leur validation se fait à cette étape.
