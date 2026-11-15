import { t } from "@/src/i18n";

/**
 * Message lisible d'une erreur de requete (axios), a afficher en toast.
 * Ordre : message du backend (texte, ou liste d'erreurs de champs
 * `[{ field, message }]` des validateurs, une ligne par champ), puis le code
 * HTTP (401, 403, 404, 429, 5xx) ou l'absence de reponse (reseau). Renvoie ""
 * si rien n'est connu : l'appelant garde son message par defaut (`|| t(...)`).
 */
export function apiErrorMessage(error: any): string {
  const data = error?.response?.data;
  const raw = data?.message ?? data?.errors ?? data?.error;
  if (Array.isArray(raw)) {
    const lines = raw
      .map((e: any) => (typeof e === "string" ? e : e?.message || (e?.field ? t("Champ invalide : {{f}}", { f: e.field }) : "")))
      .filter(Boolean);
    if (lines.length) return [...new Set(lines)].join("\n");
  } else if (typeof raw === "string" && raw.trim()) {
    return raw;
  }
  if (!error?.response) {
    return error?.isAxiosError || error?.request ? t("Impossible de joindre le serveur. Vérifiez votre connexion.") : "";
  }
  const status = Number(error.response.status);
  if (status === 401) return t("Veuillez vous reconnecter.");
  if (status === 403) return t("Accès refusé.");
  if (status === 404) return t("Ressource introuvable.");
  if (status === 429) return t("Trop de demandes, réessayez dans un instant.");
  if (status >= 500) return t("Erreur serveur, réessayez.");
  return "";
}
