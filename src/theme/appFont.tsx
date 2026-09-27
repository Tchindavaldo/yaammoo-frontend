import * as Font from "expo-font";
import React, { forwardRef, useEffect, useState } from "react";
import type { TextInputProps, TextProps } from "react-native";
import { StyleSheet } from "react-native";

// `require` et non `import * as` : Babel copierait l'objet (interop), et le
// getter redefini plus bas ne toucherait pas le module que lisent les ecrans.
const RN = require("react-native");
import { ACTIVE_FONTS, activeFontFiles, fontFor } from "./fonts";

/**
 * Police globale (voir `fonts.ts`) : `Text` et `TextInput` de `react-native`
 * sont remplaces a l'import par des versions qui posent la police du theme
 * selon le `fontWeight` du style.
 *
 * - Un style qui fixe deja un `fontFamily` (icones, ecrans a police dediee)
 *   n'est pas touche.
 * - Le `fontWeight` est retire : chaque graisse est un fichier distinct, et
 *   Android/iOS synthetiseraient sinon un faux gras par-dessus.
 * - Rien n'est remplace tant que la police n'est pas chargee (`fontsReady`).
 *
 * ⚠️ Le remplacement passe par le getter de `react-native/index.js` : il vaut
 * pour tout `import { Text } from "react-native"` lu au rendu, pas pour les
 * composants internes de RN (qui importent leur `Text` en chemin relatif).
 */
let fontsReady = false;

const withFont = (style: any) => {
  if (!fontsReady) return style;
  const flat = StyleSheet.flatten(style);
  if (flat?.fontFamily) return style;
  const family = fontFor(flat?.fontWeight);
  if (!family) return style;
  return [style, { fontFamily: family, fontWeight: undefined }];
};

const BaseText = RN.Text;
const BaseTextInput = RN.TextInput;

const AppText = forwardRef<any, TextProps>((props, ref) => (
  <BaseText {...props} ref={ref} style={withFont(props.style)} />
));
AppText.displayName = "Text";

const AppTextInput = forwardRef<any, TextInputProps>((props, ref) => (
  <BaseTextInput {...props} ref={ref} style={withFont(props.style)} />
));
AppTextInput.displayName = "TextInput";
// `TextInput.State` (focus courant) est lu par certaines libs.
Object.assign(AppTextInput, { State: (BaseTextInput as any).State });

if (ACTIVE_FONTS) {
  Object.defineProperty(RN, "Text", { configurable: true, enumerable: true, get: () => AppText });
  Object.defineProperty(RN, "TextInput", { configurable: true, enumerable: true, get: () => AppTextInput });
}

/**
 * Charge la police active ; `true` une fois prete (ou en cas d'echec, on
 * retombe alors sur la police systeme). A attendre avant le premier rendu :
 * un texte peint avant l'enregistrement de la police ne se redessine pas.
 */
export const useAppFont = (): boolean => {
  const [ready, setReady] = useState(!ACTIVE_FONTS);
  useEffect(() => {
    if (!ACTIVE_FONTS) return;
    Font.loadAsync(activeFontFiles())
      .then(() => { fontsReady = true; })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  return ready;
};
