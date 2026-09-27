import type { StaffMember } from "../types/staff.types";

/** Indicatif par défaut du champ téléphone (Cameroun). */
export const DEFAULT_DIAL = "+237";

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Saisie → E.164. Un numéro commençant par « + » est gardé tel quel, sinon
 * l'indicatif par défaut est ajouté. `null` si le numéro est invalide.
 */
export const toE164 = (input: string): string | null => {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (input.trim().startsWith("+")) {
    const full = `+${digits}`;
    return E164.test(full) ? full : null;
  }
  // Numéro local camerounais : 9 chiffres.
  return digits.length === 9 ? `${DEFAULT_DIAL}${digits}` : null;
};

/** +237677451290 → « +237 6 77 45 12 90 » ; autre indicatif : inchangé. */
export const formatPhone = (e164: string): string => {
  const m = /^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+237 ${m.slice(1).join(" ")}` : e164;
};

/** Nom affiché d'un membre : prénom + nom, sinon son numéro. */
export const memberName = (m: StaffMember): string =>
  [m.prenom, m.nom].filter(Boolean).join(" ") || formatPhone(m.phoneNumber);

/** Deux initiales ; à défaut de nom, les 2 derniers chiffres du numéro. */
export const initialsOf = (name: string, fallback = "?"): string => {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(w));
  if (words.length === 0) {
    const digits = name.replace(/\D/g, "");
    return digits ? digits.slice(-2) : fallback;
  }
  const first = words[0].charAt(0);
  const second = words.length > 1 ? words[words.length - 1].charAt(0) : words[0].charAt(1);
  return (first + (second || "")).toUpperCase();
};

export const memberInitials = (m: StaffMember) => initialsOf(memberName(m));

/** Prénom seul (« Ce que Brice peut faire »), sinon le nom affiché. */
export const firstNameOf = (m: StaffMember) => m.prenom || memberName(m);

/** Accord simple : 1 membre, 2 membres. */
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n > 1 ? many : one}`;

/** « Il y a 3 h », « Hier », « 12 sept. ». */
export const timeAgo = (iso?: string, now = new Date()): string => {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const min = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (min < 1) return "À l’instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  if (h < 48) return "Hier";
  return t.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

/** Nom d'un livreur ou candidat (`infos` du backend) : nom, sinon email, sinon « Utilisateur ». */
export const personName = (infos?: { prenom?: string; nom?: string; email?: string }) => {
  const name = [infos?.prenom, infos?.nom].filter(Boolean).join(" ");
  if (name) return name;
  if (infos?.email) return infos.email.split("@")[0];
  return "Utilisateur";
};
