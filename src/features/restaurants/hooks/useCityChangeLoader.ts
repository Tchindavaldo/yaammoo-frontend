// Changement de ville du home : vrai pendant au moins CITY_LOADER_MS, pour que
// le loader plein ecran (« Recherche des meilleurs plats... ») se voie (la
// reponse arrive souvent si vite que la liste changeait comme un filtre).
import { useEffect, useRef, useState } from "react";

const CITY_LOADER_MS = 900;

export function useCityChangeLoader(city: string | null) {
  const [active, setActive] = useState(false);
  const last = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (last.current === undefined) { last.current = city; return; }
    if (last.current === city) return;
    last.current = city;
    setActive(true);
    const id = setTimeout(() => setActive(false), CITY_LOADER_MS);
    return () => clearTimeout(id);
  }, [city]);
  // Rendu ou la ville vient de changer (effet pas encore passe) : deja vrai,
  // sinon une image de l'ancienne liste s'affichait entre deux loaders.
  const pending = last.current !== undefined && last.current !== city;
  return active || pending;
}
