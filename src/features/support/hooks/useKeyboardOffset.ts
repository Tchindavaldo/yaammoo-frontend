import { useEffect, useRef } from "react";
import { Animated, Keyboard, Platform } from "react-native";

/**
 * Décalage animé de la saisie, piloté DIRECTEMENT par les events clavier.
 *
 * ⚠️ Ne pas remplacer par un `useState` + `KeyboardAvoidingView` : l'état React
 * arrive une frame après l'ouverture du clavier, d'où l'input qu'on voit posé
 * trop haut avant de sauter à sa place. Ici on suit la durée et la hauteur que
 * le système annonce (`keyboardWillShow` sur iOS, `keyboardDidShow` sur Android),
 * donc le mouvement est synchrone et fluide.
 *
 * @param restOffset décalage au repos (navbar + safe area + marge).
 * @returns valeur animée à poser en `paddingBottom` du bloc de saisie.
 */
export const useKeyboardOffset = (restOffset: number) => {
  const offset = useRef(new Animated.Value(restOffset)).current;

  useEffect(() => {
    // iOS émet `will*` AVANT le mouvement du clavier (permet de le suivre) ;
    // Android n'a que `did*`.
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const animateTo = (value: number, duration: number) =>
      Animated.timing(offset, {
        toValue: value,
        duration: duration || 220,
        // paddingBottom n'est pas supporté par le driver natif.
        useNativeDriver: false,
      }).start();

    const show = Keyboard.addListener(showEvt, (e) => {
      // Sur iOS la vue est déjà remontée par le clavier : il ne reste qu'une
      // petite marge. Sur Android on absorbe la hauteur du clavier nous-mêmes.
      const target = Platform.OS === "ios" ? 8 : (e.endCoordinates?.height ?? 0) + 8;
      animateTo(target, e.duration ?? 220);
    });
    const hide = Keyboard.addListener(hideEvt, (e) =>
      animateTo(restOffset, e.duration ?? 220)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, [offset, restOffset]);

  return offset;
};
