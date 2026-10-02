import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { startAnalytics, track } from "./analytics";

/**
 * Monte les statistiques (layout racine) : demarrage de la file et des
 * sessions, puis temps passe par ecran. Un ecran QUITTE (autre route, ou app
 * en arriere-plan) produit un `screen_view` avec sa duree.
 */
export function useAnalytics(): void {
  useEffect(() => startAnalytics(), []);

  const pathname = usePathname();
  const current = useRef<{ screen: string; since: number } | null>(null);

  const leave = () => {
    const c = current.current;
    if (!c) return;
    track("screen_view", {
      data: { screen: c.screen.slice(0, 60), durationMs: Date.now() - c.since },
    });
    current.current = null;
  };

  useEffect(() => {
    leave();
    if (AppState.currentState === "active") {
      current.current = { screen: pathname || "/", since: Date.now() };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        if (!current.current) {
          current.current = { screen: pathRef.current || "/", since: Date.now() };
        }
      } else {
        leave();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
