/**
 * Écran d'information affiché JUSTE AVANT la popup système « Toujours »
 * (`useUserLocationSync`). Le hook demande, la carte
 * `BackgroundLocationPromptCard` (montée une fois à la racine) répond.
 *
 * Même principe que `otaNotice` : un émetteur minimal, sans état partagé.
 */

type Answer = (accepted: boolean) => void;
type Listener = (answer: Answer) => void;

let listener: Listener | null = null;

/** La carte s'abonne à son montage. */
export const onBackgroundPromptRequest = (l: Listener) => {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
};

/**
 * Affiche l'écran d'information et attend le choix de l'utilisateur.
 * @returns true = « Continuer » (la popup système suit), false = « Plus tard ».
 *   Sans carte montée, true : la popup part comme avant.
 */
export const requestBackgroundPrompt = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (!listener) {
      resolve(true);
      return;
    }
    let done = false;
    listener((accepted) => {
      if (done) return;
      done = true;
      resolve(accepted);
    });
  });
