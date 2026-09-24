import { Users } from "@/src/types";

/** Champs d'identite a demander : prenom seul, nom seul, ou les deux. */
export type MissingName = "prenom" | "nom" | "both";

/**
 * Determine quels champs d'identite manquent au profil.
 *
 * ⚠️ `userFirestore.getUser()` comble un `nom` vide par un fallback
 * (`"Utilisateur"` ou le prefixe de l'email) : ces valeurs comptent donc
 * comme un nom manquant.
 */
export function getMissingName(userData: Users | null): MissingName | null {
  const infos = userData?.infos;
  if (!infos) return null;

  const prenom = (infos.prenom || "").trim();
  const nom = (infos.nom || "").trim();
  const emailPrefix = (infos.email || "").split("@")[0].trim();

  const nomMissing =
    !nom ||
    nom === "Utilisateur" ||
    (!!emailPrefix && nom.toLowerCase() === emailPrefix.toLowerCase());
  const prenomMissing = !prenom;

  if (nomMissing && prenomMissing) return "both";
  if (prenomMissing) return "prenom";
  if (nomMissing) return "nom";
  return null;
}
