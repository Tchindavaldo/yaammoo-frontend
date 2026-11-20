// Intercepte les liens entrants. `yaammoo://shop/<id>` (QR boutique) est reecrit
// vers la page de recherche ; l'id est aussi memorise pour le demarrage a froid.
import { setPendingShopLink, shopIdFromPath } from "@/src/features/search/utils/pendingShopLink";

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const id = shopIdFromPath(path);
  if (!id) return path;
  setPendingShopLink(id);
  return `/search?shopId=${encodeURIComponent(id)}`;
}
