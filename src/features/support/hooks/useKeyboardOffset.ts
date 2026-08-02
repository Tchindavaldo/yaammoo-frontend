import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Décalage de la saisie, posé DIRECTEMENT depuis les events clavier, sans
 * animation : le mouvement suit celui du clavier système, sans transition
 * propre qui traînerait derrière lui.
 *
 * @param restOffset décalage au repos (navbar + safe area + marge).
 * @returns valeur à poser en `paddingBottom` du bloc de saisie.
 */
export const useKeyboardOffset = (restOffset: number) => {
  const [offset, setOffset] = useState(restOffset);

  useEffect(() => {
    // iOS émet `will*` AVANT le mouvement du clavier ; Android n'a que `did*`.
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvt, (e) => {
      // Android est en `adjustResize` (AndroidManifest) : le système réduit
      // déjà la fenêtre, il ne reste qu'une petite marge. iOS ne redimensionne
      // rien — c'est à nous d'absorber la hauteur du clavier.
      setOffset(Platform.OS === "ios" ? (e.endCoordinates?.height ?? 0) + 8 : 8);
    });
    const hide = Keyboard.addListener(hideEvt, () => setOffset(restOffset));

    return () => {
      show.remove();
      hide.remove();
    };
  }, [restOffset]);

  return offset;
};
