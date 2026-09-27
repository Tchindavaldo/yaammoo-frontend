/** Permission servie par `GET /staff/permissions`. */
export interface StaffPermission {
  key: string;
  label: string;
}

/** Rôle de la boutique : un nom et ses permissions. */
export interface StaffRole {
  id: string;
  name: string;
  permissions: string[];
  createdAt?: string;
}

/**
 * Membre du personnel. `userId` null = jamais connecté (invitation en
 * attente) ; `active` false = accès suspendu sans suppression.
 */
export interface StaffMember {
  id: string;
  roleId: string | null;
  /** E.164 (ex. +237677451290) : identifiant de connexion par code SMS. */
  phoneNumber: string;
  userId: string | null;
  nom?: string;
  prenom?: string;
  active: boolean;
  createdAt?: string;
}

/** Limites affichées : postes (membres) et places de livreur. */
export interface StaffPlan {
  label: string;
  memberLimit: number;
  driverLimit: number;
}

/** Saisie du formulaire « Nouveau membre ». */
export interface StaffMemberDraft {
  phoneNumber: string;
  roleId: string;
  prenom?: string;
  nom?: string;
  /** Connexion email en plus du code SMS (facultatif, mot de passe ≥ 6). */
  email?: string;
  password?: string;
}

/** Modification partielle d'un membre (rôle, suspension, identité). */
export interface StaffMemberPatch {
  roleId?: string;
  active?: boolean;
  nom?: string;
  prenom?: string;
}

/** Saisie du formulaire rôle (création ou modification). */
export interface StaffRoleDraft {
  name: string;
  permissions: string[];
}

/** Résultat d'une action : `message` = raison du refus (backend ou générique). */
export type StaffResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/** Onglets de l'écran Personnel. */
export type StaffTab = "team" | "drivers";
