# Home — pause au scroll lors de l'ajout des boutiques (pagination)

Branche de départ : `feature/horizontal-flashlist-v5.3-reset`.
Contexte : [architecture/home-scroll-pause.md](../../../architecture/home-scroll-pause.md).
Les tâches se font dans l'ordre, une par une : mesurer avant et après chacune.

[ ] 1. Mesurer en conditions réelles
    - toutes les mesures actuelles viennent d'Expo Go en dev : chiffres gonflés
    - relancer avec `npx expo start --no-dev --minify` (ou build preview)
    - couper temporairement les `console.log [ROW]` des chemins chauds
      (`handleScroll`, `listData`, `loadMore`) pendant la mesure

[ ] 2. Alléger le coût de montage d'une rangée (levier principal)
    - [x] `DesignItem.tsx` fait 2276 lignes : le découper (R4, plafond 500)
          → `designs/item/` (config, parts, styles, variants), aucun fichier > 500
    - réduire les `BlurView` par carte
    - squelette toujours monté sous chaque carte = arbre natif doublé :
      le démonter après le fondu ou l'alléger
    - mémoïser `DesignItem` (`React.memo`) et stabiliser ses `onPress={() => …}`

[ ] 3. Revoir la FlashList horizontale de chaque rangée (Design4/5/7)
    - comparer à un `ScrollView` + `.map()` pour 3-13 cartes (mesure)
    - retirer `estimatedItemSize` / `getItemLayout` (ignorés en FlashList v2)
    - `keyExtractor` : ne jamais retomber sur `Math.random()`

[x] 4. Corriger `getItemType` (app/(tabs)/index.tsx)
    → table unique `utils/designCycle.ts` partagée avec `DesignRouter`
    - table `[7,4,6,7,4,5,5] % 7` désynchronisée de `DesignRouter` (`[7,4,5] % 3`)
    - Design5 éclaté en deux groupes de recyclage
    - idéalement : extraire la table dans un module partagé

[ ] 5. Réduire les re-rendus du home à l'insertion d'une page
    - ~5 rendus en rafale (`loadingMore`, `insertLock` x2, `fastFoods`,
      `atBottom` / `loaderVisible`)
    - mémoïser `refreshControl` et `contentContainerStyle` (recréés à chaque rendu)
    - `firstScreenUris` : dépendre de `fastFoods[0]` seulement, pas de toute la liste

[ ] 6. UX d'insertion
    - GARDER l'insertion au bas strict (HOLD) : une page insérée pendant que
      l'utilisateur défile (ex. remonté pendant le fetch) = pause ressentie.
      Ne JAMAIS insérer en avance ou en plein geste.
    - une fois 2, 3 et 5 faits, réévaluer `HOLD_REVEAL_DELAY_MS` (1 s de loader)
      et la durée du gel `insertLock`

[ ] 7. Nettoyage avant merge
    - `RESET_ENABLED = true` (FastFoodContext) : sinon la liste n'est jamais tronquée
    - vérifier `TAP_HOME_RESET_ENABLED = true`
    - retirer les sondes `[ROW]` (ou `ROW_PROBE_ENABLED = false`)
    - mettre à jour `architecture/home-scroll-pause.md` et `restaurants.md`
