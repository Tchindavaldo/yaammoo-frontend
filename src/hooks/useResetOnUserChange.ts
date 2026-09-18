import { useEffect, useRef } from "react";

/**
 * Vide l'etat d'un contexte des que l'identite du compte change (login,
 * logout, changement de compte).
 *
 * Sans cela, les contextes (orders, merchant, notifications, wallet, driver)
 * gardent en memoire les donnees du compte precedent : `fetchData` sort tot
 * quand l'id devient `undefined` (deconnexion) et, au compte suivant, l'ancien
 * state reste affiche jusqu'a ce que la nouvelle reponse arrive.
 *
 * `reset` est appele au changement de cle, jamais au premier rendu (rien a
 * effacer). Il doit ne contenir que des `setState` (references stables).
 */
export function useResetOnUserChange(key: string | undefined | null, reset: () => void) {
  const previousKeyRef = useRef<string | undefined | null>(key);
  const resetRef = useRef(reset);
  resetRef.current = reset;

  useEffect(() => {
    if (previousKeyRef.current === key) return;
    previousKeyRef.current = key;
    resetRef.current();
  }, [key]);
}
