/**
 * Toast GLOBAL appelable de partout (hooks, services, composants) :
 * `showToast(message, type)`. Rendu par `GlobalToastHost` (monte une fois dans
 * `app/_layout.tsx`), via le composant `Toast` (haut d'ecran, premier plan).
 * OBLIGATOIRE : jamais `Alert.alert` pour un message (cf. CLAUDE.md R22).
 *
 * Android : chaque `<Modal>` est une fenetre systeme au-dessus de l'app, un
 * toast rendu hors d'elle passe DESSOUS. Chaque `<Modal>` monte donc son propre
 * `<GlobalToastHost modal />` ; les hotes forment une PILE et seul le dernier
 * monte (la fenetre au premier plan) affiche le toast. iOS : inutile
 * (`FullWindowOverlay`), les hotes `modal` ne font rien.
 */
export type GlobalToastType = "success" | "error" | "info";
export interface GlobalToastPayload {
  id: number;
  message: string;
  type: GlobalToastType;
  duration?: number;
}

type Listener = (t: GlobalToastPayload) => void;
/** Pile des hotes montes : le dernier est celui au premier plan. */
const hosts: Listener[] = [];
let seq = 0;

export function showToast(
  message: string,
  type: GlobalToastType = "info",
  duration?: number,
): void {
  if (!message) return;
  const top = hosts[hosts.length - 1];
  top?.({ id: ++seq, message, type, duration });
}

export function registerToastHost(l: Listener): () => void {
  hosts.push(l);
  return () => {
    const i = hosts.lastIndexOf(l);
    if (i >= 0) hosts.splice(i, 1);
  };
}
