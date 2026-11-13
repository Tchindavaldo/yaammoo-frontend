"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { StaffHeader } from "./StaffHeader";
import { Toast } from "@/src/components/Toast";
import type { DriverApplication, DriverInfo } from "@/src/features/driver/services/driverService";
import { useStaff } from "../hooks/useStaff";
import { useStaffDrivers } from "../hooks/useStaffDrivers";
import { STAFF_FREE_PLAN } from "../services/staffService";
import type { StaffMember, StaffMemberDraft, StaffRole, StaffRoleDraft, StaffTab } from "../types/staff.types";
import { memberName, personName, plural } from "../utils/staffFormat";
import { isFullAccess } from "../utils/staffPermissions";
import { StaffConfirmDialog, type StaffConfirm } from "./StaffConfirmDialog";
import { StaffDriversTab } from "./StaffDriversTab";
import { StaffMemberCreateSheet } from "./StaffMemberCreateSheet";
import { StaffDriverCreateSheet, type DriverRecruitDraft } from "./StaffDriverCreateSheet";
import { driverService } from "@/src/features/driver/services/driverService";
import { StaffMemberSheet } from "./StaffMemberSheet";
import { StaffRoleSheet } from "./StaffRoleSheet";
import { StaffSummaryCard } from "./StaffSummaryCard";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { StaffTabs } from "./StaffTabs";
import { ORPHAN_KEY, StaffTeamHead, StaffTeamTab } from "./StaffTeamTab";
import { StaffRoleMembersSheet } from "./StaffRoleMembersSheet";
import { ST } from "./staffTheme";
import { t, useLanguage } from "@/src/i18n";

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
  useLanguage();
  const [toast, setToast] = useState<ToastState>(null);
  const onLoadError = useCallback(
    () => setToast({ message: t("Impossible de charger le personnel"), type: "error" }),
    [],
  );
  const staff = useStaff(visible, onLoadError);
  const drv = useStaffDrivers(visible, onLoadError);
  const { userData } = useAuth();
  const ownerName =
    [userData?.infos?.prenom, userData?.infos?.nom].filter(Boolean).join(" ") || t("Propriétaire");
  const [headerHeight, setHeaderHeight] = useState(70);
  const [tab, setTab] = useState<StaffTab>(initialTab);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [driverCreating, setDriverCreating] = useState(false);
  const [recruiting, setRecruiting] = useState(false);
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
  // Safe-area basse réservée par ShopPageFrame.
  const fabBottom = 16;
  const member = memberId ? members.find((m) => m.id === memberId) || null : null;
  const memberRole = member ? roles.find((r) => r.id === member.roleId) || null : null;
  const openRole = expanded ? roles.find((r) => r.id === expanded) || null : null;

  const notify = (ok: boolean, success: string, error: string) =>
    setToast({ message: ok ? success : error, type: ok ? "success" : "error" });

  const openCreate = () => {
    if (membersFull) {
      setToast({ message: t("Tous les postes du plan sont pris"), type: "error" });
      return;
    }
    setCreateRoleId(roles.length === 1 ? roles[0].id : null);
    setCreating(true);
  };

  const openDriverCreate = () => {
    if (driversFull) {
      setToast({ message: t("Toutes les places de livreur sont prises"), type: "error" });
      return;
    }
    setDriverCreating(true);
  };

  const submitDriver = async (draft: DriverRecruitDraft) => {
    const fastFoodId = userData?.fastFoodId;
    if (!fastFoodId) return false;
    setRecruiting(true);
    const error = await driverService.recruitDriver(fastFoodId, draft);
    setRecruiting(false);
    if (error) {
      setToast({ message: error, type: "error" });
      return false;
    }
    setToast({ message: draft.mode === "invite" ? t("Invitation envoyée") : t("Livreur ajouté"), type: "success" });
    drv.refresh();
    return true;
  };

  const submitMember = async (draft: StaffMemberDraft) => {
    const res = await staff.createMember(draft);
    notify(res.ok, t("Membre ajouté"), res.ok ? "" : res.message);
    if (res.ok) {
      setTab("team");
    }
    return res.ok;
  };

  const saveRole = async (draft: StaffRoleDraft) => {
    const editing = roleSheet?.role;
    const res = await staff.saveRole(draft, editing?.id);
    notify(res.ok, editing ? t("Rôle modifié") : t("Rôle créé"), res.ok ? "" : res.message);
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
        title: t("Supprimer ce rôle ?"),
        message: t("« {{a}} » n’est attribué à personne. Il sera supprimé.", { a: role.name }),
        confirmLabel: t("Supprimer"),
      },
      async () => {
        const res = await staff.removeRole(role.id);
        notify(res.ok, t("Rôle supprimé"), res.ok ? "" : res.message);
        return res.ok;
      },
    );

  const removeMember = (m: StaffMember) =>
    ask(
      {
        title: t("Retirer ce membre ?"),
        message: t("{{a}} n’aura plus accès à la boutique. Son poste sera libéré.", { a: memberName(m) }),
        confirmLabel: t("Retirer"),
      },
      async () => {
        const res = await staff.removeMember(m.id);
        notify(res.ok, t("Membre retiré"), res.ok ? "" : res.message);
        if (res.ok) setMemberId(null);
        return res.ok;
      },
    );

  const changeRole = async (roleId: string) => {
    if (!member) return false;
    const res = await staff.updateMember(member.id, { roleId });
    notify(res.ok, t("Rôle changé"), res.ok ? "" : res.message);
    return res.ok;
  };

  const setActive = async (active: boolean) => {
    if (!member) return false;
    const res = await staff.updateMember(member.id, { active });
    notify(res.ok, active ? t("Accès réactivé") : t("Accès suspendu"), res.ok ? "" : res.message);
    return res.ok;
  };

  const decide = async (app: DriverApplication, decision: "accepted" | "refused") => {
    if (decision === "accepted" && driversFull) {
      setToast({ message: t("Toutes les places de livreur sont prises"), type: "error" });
      return;
    }
    const res = await drv.decide(app, decision);
    notify(res.ok, decision === "accepted" ? t("Livreur accepté") : t("Demande refusée"), res.ok ? "" : res.message);
  };

  const removeDriver = (d: DriverInfo) =>
    ask(
      {
        title: t("Retirer ce livreur ?"),
        message: t("{{a}} ne pourra plus livrer les commandes de votre boutique.", { a: personName(d.infos) }),
        confirmLabel: t("Retirer"),
      },
      async () => {
        const res = await drv.removeDriver(d.driverId);
        notify(res.ok, t("Livreur retiré"), res.ok ? "" : res.message);
        return res.ok;
      },
    );

  const refresh = () => Promise.all([staff.refresh(), drv.refresh()]);

  return (
    // Route `app/shop/staff.tsx` dans ShopPageFrame (safe-area + retour par
    // glissement du bord gauche) : plus de <Modal> englobant.
    <View style={styles.overlay}>

      <StaffHeader
        title={t("Personnel")}
        subtitle={`${plural(roles.length, t("rôle"))} · ${plural(members.length, t("membre"))} · ${plural(drv.drivers.length, t("livreur"))}`}
        right={<HeaderPill label={t("Retour")} icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      {/* Haut fixe : carte, onglets et ligne « Rôles de la boutique ». */}
      <View style={[styles.fixedTop, { paddingTop: headerHeight + 8 }]}>
        {/* Carte hero (gerant, compteurs) masquee pour l'instant.
        <StaffSummaryCard
          ownerName={ownerName}
          roles={roles.length}
          members={members.length}
          drivers={drv.drivers.length}
        />
        */}
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
        style={styles.scroll}
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
        {tab === "drivers" ? (
          <Pressable
            onPress={openDriverCreate}
            style={({ pressed }) => [styles.fab, driversFull ? styles.fabOff : styles.fabOn, pressed && !driversFull && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Ionicons name="bicycle-outline" size={18} color={driversFull ? "#8A8A90" : "#fff"} />
            <Text style={[styles.fabText, { color: driversFull ? "#8A8A90" : "#fff" }]}>
              {driversFull ? t("Toutes les places sont prises") : t("Ajouter un livreur")}
            </Text>
          </Pressable>
        ) : (
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
              {membersFull ? t("Tous les postes sont pris") : t("Ajouter un membre")}
            </Text>
          </Pressable>
        )}
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
        visible={creating || driverCreating || !!roleSheet}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => (roleSheet ? setRoleSheet(null) : driverCreating ? setDriverCreating(false) : setCreating(false))}
      >
      <View style={styles.pages}>
      {creating && (
        <StaffMemberCreateSheet
          roles={sortedRoles}
          catalog={catalog}
          slotLabel={t("Poste {{a}} sur {{b}}", { a: members.length + 1, b: plan.memberLimit })}
          roleId={createRoleId}
          onSelectRole={setCreateRoleId}
          saving={staff.saving}
          onSubmit={submitMember}
          onNewRole={() => setRoleSheet({ role: null, forCreate: true })}
          onEditRole={(role) => setRoleSheet({ role, forCreate: true })}
          onClose={() => setCreating(false)}
        />
      )}

      {driverCreating && (
        <StaffDriverCreateSheet
          slotLabel={t("Livreur {{a}} sur {{b}}", { a: drv.drivers.length + 1, b: plan.driverLimit })}
          saving={recruiting}
          onSubmit={submitDriver}
          onClose={() => setDriverCreating(false)}
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
      {toast && (creating || driverCreating || !!roleSheet) && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
        {/* Toast global au premier plan (Android). */}
        <GlobalToastHost modal />
      </Modal>

      <StaffConfirmDialog confirm={confirm} busy={confirmBusy} onCancel={() => setConfirm(null)} />

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </View>
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
