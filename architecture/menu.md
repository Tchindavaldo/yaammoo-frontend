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
├── AddMenuSheetMultiStep.tsx       # Formulaire menu (Modal pour modif / inline `embedded` pour création) — 3 étapes
├── recap-designs/                  # Designs alternatifs de l'étape récap (switcher)
│   ├── MenuDraft.types.ts          # Type `MenuDraft` (snapshot du formulaire) + sélecteurs (validPrices, namedItems)
│   ├── MenuRecap.tsx               # Switcher : pills Aperçu/Blocs/Édito/Synthèse → rend le design choisi
│   ├── MenuRecapDesign1.tsx        # "Aperçu" — carte client (couverture + tarifs/extras/boissons listés)
│   ├── MenuRecapDesign2.tsx        # "Blocs" — hero card + blocs bordés par section
│   ├── MenuRecapDesign3.tsx        # "Édito" — mise en page éditoriale
│   └── MenuRecapDesign4.tsx        # "Synthèse" — recap bref (bandeau + 4 stat-tuiles + résumés condensés +N)
└── MenuManageModal.tsx             # Overlay plein écran gestion menus (Settings → "Gestion menu")
```

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

**Hauteur du mode Modal** : `MODAL_HEIGHT` (px, fixe, identique sur les 3 étapes pour éviter
un saut de taille au changement d'étape) = **540** (~62% d'un écran de référence 844px).

> ⚠️ **Safe-area basse (mode Modal) : à absorber côté footer, jamais sur `sheetWrap`.**
> Un `paddingBottom: insets.bottom` posé sur `sheetWrap` (le conteneur externe, hauteur
> `MODAL_HEIGHT + insets.bottom`) pousse `sheet` (fond blanc, `flex:1`) vers le haut et laisse
> apparaître le fond gris de l'`overlay` sous le bouton "Suivant" — bug déjà rencontré. La
> safe-area doit rester absorbée à l'intérieur d'un élément à fond blanc (footer ou sheet),
> pas retranchée de la zone visible du sheet lui-même.
