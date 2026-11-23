// Clavier ouvert ou non (sheet menu) : le contenu ne défile que clavier ouvert.
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(show, () => setOpen(true));
    const h = Keyboard.addListener(hide, () => setOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  return open;
}
