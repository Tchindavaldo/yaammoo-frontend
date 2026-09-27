import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { staffErrorMessage, staffService } from "../services/staffService";
import type {
  StaffMember,
  StaffMemberDraft,
  StaffMemberPatch,
  StaffResult,
  StaffRole,
  StaffRoleDraft,
} from "../types/staff.types";
import { buildCatalog, PERMISSION_CATALOG, type PermissionMeta } from "../utils/staffPermissions";

/**
 * Membres, rôles et catalogue de permissions de la boutique, et leurs
 * actions. Chargé à l'ouverture de l'écran (`active`), pas au boot.
 *
 * @param onLoadError appelé si le chargement échoue (l'écran affiche un toast).
 */
export const useStaff = (active: boolean, onLoadError: () => void) => {
  const { userData } = useAuth();
  const fastFoodId = userData?.fastFoodId;

  const [members, setMembers] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionMeta[]>(PERMISSION_CATALOG);
  /** Premier chargement terminé (succès ou échec) : l'état vide peut s'afficher. */
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Une écriture est en cours (création, modification, retrait). */
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(
    (ff: string) => Promise.all([staffService.getMembers(ff), staffService.getRoles(ff)]),
    [],
  );

  // Chargement à l'ouverture. Les setState restent dans les callbacks de la
  // promesse, jamais dans le corps de l'effet.
  useEffect(() => {
    if (!active || !fastFoodId) return;
    let alive = true;
    fetchAll(fastFoodId).then(
      ([m, r]) => {
        if (!alive) return;
        setMembers(m);
        setRoles(r);
        setLoaded(true);
      },
      (error) => {
        if (!alive) return;
        console.error("Error fetching staff:", error);
        setLoaded(true);
        onLoadError();
      },
    );
    // Catalogue : échec = catalogue local (mêmes clés que le backend).
    staffService.getPermissions().then(
      (list) => {
        if (alive) setCatalog(buildCatalog(list));
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [active, fastFoodId, fetchAll, onLoadError]);

  /** Pull-to-refresh. */
  const refresh = useCallback(async () => {
    if (!fastFoodId) return;
    setRefreshing(true);
    try {
      const [m, r] = await fetchAll(fastFoodId);
      setMembers(m);
      setRoles(r);
    } catch (error) {
      console.error("Error fetching staff:", error);
      onLoadError();
    } finally {
      setRefreshing(false);
    }
  }, [fastFoodId, fetchAll, onLoadError]);

  /** Enveloppe commune : verrou `saving`, log et message d'erreur. */
  const run = useCallback(
    async <T>(label: string, fallback: string, fn: (ff: string) => Promise<T>): Promise<StaffResult<T>> => {
      if (!fastFoodId) return { ok: false, message: "Boutique introuvable" };
      setSaving(true);
      try {
        return { ok: true, data: await fn(fastFoodId) };
      } catch (error) {
        console.error(`Error ${label}:`, error);
        return { ok: false, message: staffErrorMessage(error, fallback) };
      } finally {
        setSaving(false);
      }
    },
    [fastFoodId],
  );

  const createMember = useCallback(
    (draft: StaffMemberDraft) =>
      run("creating staff member", "Création impossible, réessayez", async (ff) => {
        const member = await staffService.createMember(ff, draft);
        setMembers((prev) => [...prev.filter((p) => p.id !== member.id), member]);
        return member;
      }),
    [run],
  );

  const updateMember = useCallback(
    (memberId: string, patch: StaffMemberPatch) =>
      run("updating staff member", "Modification impossible, réessayez", async (ff) => {
        const member = await staffService.updateMember(ff, memberId, patch);
        setMembers((prev) => prev.map((p) => (p.id === member.id ? member : p)));
        return member;
      }),
    [run],
  );

  const removeMember = useCallback(
    (memberId: string) =>
      run("removing staff member", "Retrait impossible, réessayez", async (ff) => {
        await staffService.removeMember(ff, memberId);
        setMembers((prev) => prev.filter((p) => p.id !== memberId));
        return undefined;
      }),
    [run],
  );

  /** Crée le rôle, ou le modifie si `roleId` est fourni. */
  const saveRole = useCallback(
    (draft: StaffRoleDraft, roleId?: string) =>
      run("saving staff role", "Enregistrement impossible, réessayez", async (ff) => {
        const role = roleId
          ? await staffService.updateRole(ff, roleId, draft)
          : await staffService.createRole(ff, draft);
        setRoles((prev) =>
          prev.some((r) => r.id === role.id)
            ? prev.map((r) => (r.id === role.id ? role : r))
            : [...prev, role],
        );
        return role;
      }),
    [run],
  );

  const removeRole = useCallback(
    (roleId: string) =>
      run("removing staff role", "Suppression impossible, réessayez", async (ff) => {
        await staffService.removeRole(ff, roleId);
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
        return undefined;
      }),
    [run],
  );

  return {
    members,
    roles,
    catalog,
    loaded,
    refreshing,
    saving,
    refresh,
    createMember,
    updateMember,
    removeMember,
    saveRole,
    removeRole,
  };
};
