import { Config } from "@/src/api/config";
import axios from "axios";
import type {
  StaffMember,
  StaffMemberDraft,
  StaffMemberPatch,
  StaffPermission,
  StaffPlan,
  StaffRole,
  StaffRoleDraft,
} from "../types/staff.types";

const BASE = () => `${Config.apiUrl}/staff`;

/**
 * Limites affichées par l'écran Personnel. Le backend n'expose pas encore de
 * quota de personnel : ces valeurs vivent ici, en un seul endroit, en
 * attendant qu'il les serve (même rôle que `FREE_PLAN` des notifications).
 */
export const STAFF_FREE_PLAN: StaffPlan = {
  label: "Gratuit",
  memberLimit: 8,
  driverLimit: 5,
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const normalizeRole = (raw: any): StaffRole | null => {
  if (!raw?.id || !raw?.name) return null;
  return {
    id: String(raw.id),
    name: String(raw.name),
    permissions: Array.isArray(raw.permissions)
      ? raw.permissions.filter((p: unknown) => typeof p === "string")
      : [],
    createdAt: str(raw.createdAt),
  };
};

const normalizeMember = (raw: any): StaffMember | null => {
  if (!raw?.id || !raw?.phoneNumber) return null;
  const roleId = raw.roleId ?? raw.role?.id;
  return {
    id: String(raw.id),
    roleId: roleId ? String(roleId) : null,
    phoneNumber: String(raw.phoneNumber),
    userId: raw.userId ? String(raw.userId) : null,
    nom: str(raw.nom),
    prenom: str(raw.prenom),
    active: raw.active !== false,
    createdAt: str(raw.createdAt),
  };
};

const list = <T>(data: unknown, map: (raw: any) => T | null): T[] =>
  Array.isArray(data) ? (data.map(map).filter(Boolean) as T[]) : [];

/** Message du backend (numéro déjà membre, rôle encore attribué…), sinon générique. */
export const staffErrorMessage = (error: any, fallback: string): string => {
  const msg = error?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : fallback;
};

/**
 * API du personnel d'une boutique (`/staff`). Réponses `{ success, data }`.
 * Le propriétaire (et un membre `staff.manage`) y a accès ; le Bearer est
 * posé par `setupHttp`.
 */
export const staffService = {
  /** Catalogue des permissions attribuables. */
  async getPermissions(): Promise<StaffPermission[]> {
    const res = await axios.get(`${BASE()}/permissions`);
    return list(res.data?.data, (p) =>
      p?.key ? { key: String(p.key), label: String(p.label || p.key) } : null,
    );
  },

  async getMembers(fastFoodId: string): Promise<StaffMember[]> {
    const res = await axios.get(`${BASE()}/${fastFoodId}/members`);
    return list(res.data?.data, normalizeMember);
  },

  async getRoles(fastFoodId: string): Promise<StaffRole[]> {
    const res = await axios.get(`${BASE()}/${fastFoodId}/roles`);
    return list(res.data?.data, normalizeRole);
  },

  /** Crée un membre ; il se connectera avec son numéro par code SMS. */
  async createMember(fastFoodId: string, draft: StaffMemberDraft): Promise<StaffMember> {
    const res = await axios.post(`${BASE()}/${fastFoodId}/members`, draft);
    const member = normalizeMember(res.data?.data);
    if (!member) throw new Error("Réponse de création invalide");
    return member;
  },

  /** `active: false` suspend l'accès sans supprimer le membre. */
  async updateMember(
    fastFoodId: string,
    memberId: string,
    patch: StaffMemberPatch,
  ): Promise<StaffMember> {
    const res = await axios.patch(`${BASE()}/${fastFoodId}/members/${memberId}`, patch);
    const member = normalizeMember(res.data?.data);
    if (!member) throw new Error("Réponse de modification invalide");
    return member;
  },

  async removeMember(fastFoodId: string, memberId: string): Promise<void> {
    await axios.delete(`${BASE()}/${fastFoodId}/members/${memberId}`);
  },

  async createRole(fastFoodId: string, draft: StaffRoleDraft): Promise<StaffRole> {
    const res = await axios.post(`${BASE()}/${fastFoodId}/roles`, draft);
    const role = normalizeRole(res.data?.data);
    if (!role) throw new Error("Réponse de création invalide");
    return role;
  },

  async updateRole(fastFoodId: string, roleId: string, draft: StaffRoleDraft): Promise<StaffRole> {
    const res = await axios.patch(`${BASE()}/${fastFoodId}/roles/${roleId}`, draft);
    const role = normalizeRole(res.data?.data);
    if (!role) throw new Error("Réponse de modification invalide");
    return role;
  },

  /** Refusé (409) tant que le rôle est attribué à un membre. */
  async removeRole(fastFoodId: string, roleId: string): Promise<void> {
    await axios.delete(`${BASE()}/${fastFoodId}/roles/${roleId}`);
  },
};
