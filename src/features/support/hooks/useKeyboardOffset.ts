import { useEffect, useRef } from "react";
import { Animated, Keyboard, Platform } from "react-native";

/** Durée de la remontée à l'ouverture du clavier (ms), volontairement courte. */
const OPEN_DURATION = 140;

/**
 * Décalage de la saisie, piloté par les events clavier.
 *
 * L'ouverture est animée (courte), la **fermeture est instantanée** : une
 * transition de sortie faisait traîner la saisie derrière le clavier qui
 * descend.
 *
 * @param restOffset décalage au repos (navbar + safe area + marge).
 * @returns valeur animée à poser en `paddingBottom` du bloc de saisie.
 */
export const useKeyboardOffset = (restOffset: number) => {
  const offset = useRef(new Animated.Value(restOffset)).current;

  useEffect(() => {
    // iOS émet `will*` AVANT le mouvement du clavier ; Android n'a que `did*`.
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvt, (e) => {
      // Android est en `adjustResize` (AndroidManifest) : le système réduit
      // déjà la fenêtre, il ne reste qu'une petite marge. iOS ne redimensionne
      // rien — c'est à nous d'absorber la hauteur du clavier.
      const target =
        Platform.OS === "ios" ? (e.endCoordinates?.height ?? 0) + 8 : 8;
      Animated.timing(offset, {
        toValue: target,
        duration: OPEN_DURATION,
        // paddingBottom n'est pas supporté par le driver natif.
        useNativeDriver: false,
      }).start();
    });

    const hide = Keyboard.addListener(hideEvt, () => {
      offset.stopAnimation();
      offset.setValue(restOffset);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [offset, restOffset]);

  return offset;
};
