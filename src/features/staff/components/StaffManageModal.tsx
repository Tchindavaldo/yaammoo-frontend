import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { StaffHeader } from "./StaffHeader";
import { Toast } from "@/src/components/Toast";
import type { DriverApplication, DriverInfo } from "@/src/features/driver/services/driverService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStaff } from "../hooks/useStaff";
import { useStaffDrivers } from "../hooks/useStaffDrivers";
import { STAFF_FREE_PLAN } from "../services/staffService";
import type { StaffMember, StaffMemberDraft, StaffRole, StaffRoleDraft, StaffTab } from "../types/staff.types";
import { memberName, personName, plural } from "../utils/staffFormat";
import { isFullAccess } from "../utils/staffPermissions";
import { StaffConfirmDialog, type StaffConfirm } from "./StaffConfirmDialog";
import { StaffDriversTab } from "./StaffDriversTab";
import { StaffMemberCreateSheet } from "./StaffMemberCreateSheet";
import { StaffMemberSheet } from "./StaffMemberSheet";
import { StaffRoleSheet } from "./StaffRoleSheet";
import { StaffSummaryCard } from "./StaffSummaryCard";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { StaffTabs } from "./StaffTabs";
import { ORPHAN_KEY, StaffTeamHead, StaffTeamTab } from "./StaffTeamTab";
import { StaffRoleMembersSheet } from "./StaffRoleMembersSheet";
import { ST } from "./staffTheme";

const FAB_HEIGHT = 54;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Onglet ouvert (deep-link `?section=drivers` → Livreurs). */
  initialTab?: StaffTab;
}

type ToastState = { message: string; type: "success" | "error" } | null;
/** Feuille rôle ouverte : rôle modifié (null = création), et si elle sert le formulaire membre. */
type RoleSheetState = { role: StaffRole | null; forCreate: boolean } | null;

/**
 * Écran plein écran « Personnel » (Settings → Boutique) : quotas, rôles et
 * leurs membres, livreurs et demandes. Remplace l'ancien écran « Livreurs ».
 * Page entière dans un <Modal> plein écran : couvre header et tab bar.
 */
export const StaffManageModal: React.FC<Props> = ({ visible, onClose, initialTab = "team" }) => {
  const [toast, setToast] = useState<ToastState>(null);
  const onLoadError = useCallback(
    () => setToast({ message: "Impossible de charger le personnel", type: "error" }),
    [],
  );
  const staff = useStaff(visible, onLoadError);
  const drv = useStaffDrivers(visible, onLoadError);
  // Page plein écran (pas de tab bar) : FAB sur la safe-area.
  const insets = useSafeAreaInsets();
  const { userData } = useAuth();
  const ownerName =
    [userData?.infos?.prenom, userData?.infos?.nom].filter(Boolean).join(" ") || "Propriétaire";
  const [headerHeight, setHeaderHeight] = useState(70);
  const [tab, setTab] = useState<StaffTab>(initialTab);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createRoleId, setCreateRoleId] = useState<string | null>(null);
  const [roleSheet, setRoleSheet] = useState<RoleSheetState>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<StaffConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Chaque ouverture repart de l'onglet demandé, feuilles fermées. Ajusté
  // pendant le rendu (pas dans un effet) : aucun rendu intermédiaire.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const openKey = visible ? initialTab : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (openKey) {
      setTab(openKey);
      setExpanded(null);
      setCreating(false);
      setRoleSheet(null);
      setMemberId(null);
    }
  }

  const plan = STAFF_FREE_PLAN;
  const { members, roles, catalog } = staff;

  const byRole = useMemo(() => {
    const map = new Map<string, StaffMember[]>();
    for (const m of members) {
      if (!m.roleId) continue;
      map.set(m.roleId, [...(map.get(m.roleId) || []), m]);
    }
    return map;
  }, [members]);

  const membersOf = useCallback((roleId: string) => byRole.get(roleId) || [], [byRole]);

  // Rôles « Accès complet » d'abord, puis les plus peuplés.
  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        const full = Number(isFullAccess(b.permissions, catalog)) - Number(isFullAccess(a.permissions, catalog));
        if (full) return full;
        const size = membersOf(b.id).length - membersOf(a.id).length;
        return size || a.name.localeCompare(b.name);
      }),
    [roles, catalog, membersOf],
  );

  const orphans = useMemo(
    () => members.filter((m) => !m.roleId || !roles.some((r) => r.id === m.roleId)),
    [members, roles],
  );

  if (!visible) return null;

  const membersFull = members.length >= plan.memberLimit;
  const driversFull = drv.drivers.length >= plan.driverLimit;
  const fabBottom = insets.bottom + 16;
  const member = memberId ? members.find((m) => m.id === memberId) || null : null;
  const memberRole = member ? roles.find((r) => r.id === member.roleId) || null : null;
  const openRole = expanded ? roles.find((r) => r.id === expanded) || null : null;

  const notify = (ok: boolean, success: string, error: string) =>
    setToast({ message: ok ? success : error, type: ok ? "success" : "error" });

  const openCreate = () => {
    if (membersFull) {
      setToast({ message: "Tous les postes du plan sont pris", type: "error" });
      return;
    }
    setCreateRoleId(roles.length === 1 ? roles[0].id : null);
    setCreating(true);
  };

  const submitMember = async (draft: StaffMemberDraft) => {
    const res = await staff.createMember(draft);
    notify(res.ok, "Membre ajouté", res.ok ? "" : res.message);
    if (res.ok) {
      setTab("team");
    }
    return res.ok;
  };

  const saveRole = async (draft: StaffRoleDraft) => {
    const editing = roleSheet?.role;
    const res = await staff.saveRole(draft, editing?.id);
    notify(res.ok, editing ? "Rôle modifié" : "Rôle créé", res.ok ? "" : res.message);
    if (res.ok && roleSheet?.forCreate && !editing) setCreateRoleId(res.data.id);
    return res.ok;
  };

  /** Confirmation commune : exécute, ferme, puis toast. */
  const ask = (c: Omit<StaffConfirm, "onConfirm">, run: () => Promise<boolean>) =>
    setConfirm({
      ...c,
      onConfirm: async () => {
        setConfirmBusy(true);
        await run();
        setConfirmBusy(false);
        setConfirm(null);
      },
    });

  const deleteRole = (role: StaffRole) =>
    ask(
      {
        title: "Supprimer ce rôle ?",
        message: `« ${role.name} » n’est attribué à personne. Il sera supprimé.`,
        confirmLabel: "Supprimer",
      },
      async () => {
        const res = await staff.removeRole(role.id);
        notify(res.ok, "Rôle supprimé", res.ok ? "" : res.message);
        return res.ok;
      },
    );

  const removeMember = (m: StaffMember) =>
    ask(
      {
        title: "Retirer ce membre ?",
        message: `${memberName(m)} n’aura plus accès à la boutique. Son poste sera libéré.`,
        confirmLabel: "Retirer",
      },
      async () => {
        const res = await staff.removeMember(m.id);
        notify(res.ok, "Membre retiré", res.ok ? "" : res.message);
        if (res.ok) setMemberId(null);
        return res.ok;
      },
    );

  const changeRole = async (roleId: string) => {
    if (!member) return false;
    const res = await staff.updateMember(member.id, { roleId });
    notify(res.ok, "Rôle changé", res.ok ? "" : res.message);
    return res.ok;
  };

  const setActive = async (active: boolean) => {
    if (!member) return false;
    const res = await staff.updateMember(member.id, { active });
    notify(res.ok, active ? "Accès réactivé" : "Accès suspendu", res.ok ? "" : res.message);
    return res.ok;
  };

  const decide = async (app: DriverApplication, decision: "accepted" | "refused") => {
    if (decision === "accepted" && driversFull) {
      setToast({ message: "Toutes les places de livreur sont prises", type: "error" });
      return;
    }
    const res = await drv.decide(app, decision);
    notify(res.ok, decision === "accepted" ? "Livreur accepté" : "Demande refusée", res.ok ? "" : res.message);
  };

  const removeDriver = (d: DriverInfo) =>
    ask(
      {
        title: "Retirer ce livreur ?",
        message: `${personName(d.infos)} ne pourra plus livrer les commandes de votre boutique.`,
        confirmLabel: "Retirer",
      },
      async () => {
        const res = await drv.removeDriver(d.driverId);
        notify(res.ok, "Livreur retiré", res.ok ? "" : res.message);
        return res.ok;
      },
    );

  const refresh = () => Promise.all([staff.refresh(), drv.refresh()]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
    <View style={styles.overlay}>

      <StaffHeader
        title="Personnel"
        subtitle={`${plural(roles.length, "rôle")} · ${plural(members.length, "membre")} · ${plural(drv.drivers.length, "livreur")}`}
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      {/* Haut fixe : carte, onglets et ligne « Rôles de la boutique ». */}
      <View style={[styles.fixedTop, { paddingTop: headerHeight + 8 }]}>
        <StaffSummaryCard
          ownerName={ownerName}
          roles={roles.length}
          members={members.length}
          drivers={drv.drivers.length}
        />
        <StaffTabs
          tab={tab}
          onChange={setTab}
          members={members.length}
          drivers={drv.drivers.length}
          pending={drv.applications.length}
        />
        {tab === "team" && (
          <StaffTeamHead onNewRole={() => setRoleSheet({ role: null, forCreate: false })} />
        )}
      </View>

      {/* Seules les listes défilent, tronquées au bord de la safe-area basse. */}
      <ScrollView
        style={[styles.scroll, { marginBottom: insets.bottom }]}
        contentContainerStyle={[styles.content, { paddingTop: 2, paddingBottom: FAB_HEIGHT + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={staff.refreshing || drv.refreshing} onRefresh={refresh} />
        }
      >
        {tab === "team" ? (
          <StaffTeamTab
            loaded={staff.loaded}
            roles={sortedRoles}
            membersOf={membersOf}
            orphans={orphans}
            catalog={catalog}
            drivers={drv.drivers}
            pending={drv.applications.length}
            onOpenRole={setExpanded}
            onNewRole={() => setRoleSheet({ role: null, forCreate: false })}
            onOpenDrivers={() => setTab("drivers")}
          />
        ) : (
          <StaffDriversTab
            applications={drv.applications}
            drivers={drv.drivers}
            loaded={drv.loaded}
            deciding={drv.deciding}
            removingId={drv.removingId}
            onDecide={decide}
            onRemove={removeDriver}
          />
        )}
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: fabBottom }]} pointerEvents="box-none">
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [
            styles.fab,
            membersFull ? styles.fabOff : styles.fabOn,
            pressed && !membersFull && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="person-add-outline" size={18} color={membersFull ? "#8A8A90" : "#fff"} />
          <Text style={[styles.fabText, { color: membersFull ? "#8A8A90" : "#fff" }]}>
            {membersFull ? "Tous les postes sont pris" : "Ajouter un membre"}
          </Text>
        </Pressable>
      </View>

      {expanded && (
        <StaffRoleMembersSheet
          key={expanded}
          role={openRole}
          members={expanded === ORPHAN_KEY ? orphans : membersOf(expanded)}
          catalog={catalog}
          onMemberPress={(m) => setMemberId(m.id)}
          onEdit={openRole ? () => setRoleSheet({ role: openRole, forCreate: false }) : undefined}
          onDelete={
            openRole
              ? () => {
                  setExpanded(null);
                  deleteRole(openRole);
                }
              : undefined
          }
          onClose={() => setExpanded(null)}
        />
      )}

      {member && (
        <StaffMemberSheet
          key={member.id}
          member={member}
          role={memberRole}
          roles={sortedRoles}
          catalog={catalog}
          mates={memberRole ? membersOf(memberRole.id).filter((m) => m.id !== member.id).map(memberName) : []}
          saving={staff.saving}
          onChangeRole={changeRole}
          onSetActive={setActive}
          onRemove={() => removeMember(member)}
          onClose={() => setMemberId(null)}
        />
      )}

      {/* Pages entières (formulaires) : un seul <Modal> couvre header et tab
          bar ; la page rôle s'empile au-dessus de la page membre. */}
      <Modal
        visible={creating || !!roleSheet}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => (roleSheet ? setRoleSheet(null) : setCreating(false))}
      >
      <View style={styles.pages}>
      {creating && (
        <StaffMemberCreateSheet
          roles={sortedRoles}
          catalog={catalog}
          slotLabel={`Poste ${members.length + 1} sur ${plan.memberLimit}`}
          roleId={createRoleId}
          onSelectRole={setCreateRoleId}
          saving={staff.saving}
          onSubmit={submitMember}
          onNewRole={() => setRoleSheet({ role: null, forCreate: true })}
          onEditRole={(role) => setRoleSheet({ role, forCreate: true })}
          onClose={() => setCreating(false)}
        />
      )}

      {roleSheet && (
        <StaffRoleSheet
          key={roleSheet.role?.id || "new"}
          role={roleSheet.role}
          roles={roles}
          catalog={catalog}
          saving={staff.saving}
          onSave={saveRole}
          onClose={() => setRoleSheet(null)}
        />
      )}
      </View>
      {toast && (creating || !!roleSheet) && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
      </Modal>

      <StaffConfirmDialog confirm={confirm} busy={confirmBusy} onCancel={() => setConfirm(null)} />

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  fixedTop: { gap: 10, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: "#fff" },
  pages: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, gap: 10, paddingHorizontal: 16 },
  fabWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fab: {
    height: FAB_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    borderRadius: FAB_HEIGHT / 2,
  },
  fabOn: {
    backgroundColor: ST.ink,
    shadowColor: ST.ink,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fabOff: { backgroundColor: ST.line },
  fabText: { fontSize: 16, fontWeight: "600" },
});
