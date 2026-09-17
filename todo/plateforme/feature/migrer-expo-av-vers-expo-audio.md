# Migrer expo-av vers expo-audio (notes vocales livreur)

[ ] `expo-av` est **déprécié en SDK 54** et sera supprimé : un futur SDK cassera
      la lecture des notes vocales et imposera un build en urgence.
    - `expo-audio` (~1.1.1) est déjà installé, le code n'est PAS migré.
    - Seul appelant : `src/features/merchant/components/MerchantOrderLivraisonTab.tsx`
      (`Audio.Sound.createAsync({ uri: user.voiceNoteUri })`, lecture de la note
      vocale laissée par le client).
    - `expo-audio` remplace `Audio.Sound` par le hook `useAudioPlayer` : la
      migration touche l'état local du composant, pas seulement l'import.
    - Retirer `expo-av` de `package.json` une fois le dernier appelant migré.
