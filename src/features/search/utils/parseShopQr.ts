// Lit le contenu d'un QR code de boutique et en extrait l'identifiant.
// Utilise par ShopQrScanner (page de recherche). Formats acceptes : id seul,
// `yaammoo://shop/<id>` ou lien web `.../shop/<id>` (dernier segment du chemin).

/** Identifiant de boutique contenu dans le QR, ou null si illisible. */
export const parseShopQr = (raw: string): string | null => {
  const text = (raw || "").trim();
  if (!text) return null;
  const clean = text.split(/[?#]/)[0].replace(/\/+$/, "");
  const id = clean.split("/").pop() || "";
  return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
};
