/**
 * Toast GLOBAL appelable de partout (hooks, services, composants) :
 * `showToast(message, type)`. Rendu par `GlobalToastHost` (monte une fois dans
 * `app/_layout.tsx`), via le composant `Toast` (haut d'ecran, premier plan).
 * OBLIGATOIRE : jamais `Alert.alert` pour un message (cf. CLAUDE.md R22).
 */
export type GlobalToastType = "success" | "error" | "info";
export interface GlobalToastPayload {
  id: number;
  message: string;
  type: GlobalToastType;
  duration?: number;
}

type Listener = (t: GlobalToastPayload) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function showToast(
  message: string,
  type: GlobalToastType = "info",
  duration?: number,
): void {
  if (!message) return;
  const payload = { id: ++seq, message, type, duration };
  listeners.forEach((l) => l(payload));
}

export function subscribeToast(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
