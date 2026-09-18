# Recadrage libre des images (menus, boutique)

[ ] Remplacer le recadrage carré imposé par un recadrage **à ratio libre**.
    - `allowsEditing: true` d'`expo-image-picker` force un carré sur iOS : c'est
      une limite de l'UI native, aucun réglage ne la lève.
    - `react-native-image-crop-picker` (^0.51.1) est **installé** pour ça
      (`freeStyleCropEnabled: true`), mais aucun écran ne l'utilise encore.
    - ⚠️ Le module n'a **pas** de config plugin Expo : ne rien ajouter dans
      `plugins`, la permission passe par `ios/yaammoo/Info.plist`.
    - Appelants actuels d'`expo-image-picker` à arbitrer un par un :
      - `src/features/merchant/components/AddMenuSheetMultiStep.tsx`
        (`allowsEditing: index !== 0` — la 1re image est volontairement non
        recadrée, voir l'OTA « premiere image sans recadrage automatique »)
      - `src/features/merchant/components/create-boutique/useCreateBoutique.ts`
      - `src/features/merchant/components/edit-boutique/useEditBoutique.ts`
      - `src/features/bonus/hooks/useBonusFlyer.ts`
