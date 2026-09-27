import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StaffMember, StaffRole } from "../types/staff.types";
import { memberInitials, plural } from "../utils/staffFormat";
import { grantedOf, isFullAccess, type PermissionMeta } from "../utils/staffPermissions";
import { StaffAvatar } from "./StaffAvatar";
import { ST } from "./staffTheme";

const MAX_STACK = 4;
const MAX_CHIPS = 3;

interface Props {
  /** null = membres dont le rôle n'existe plus (« Sans rôle »). */
  role: StaffRole | null;
  members: StaffMember[];
  catalog: PermissionMeta[];
  /** Ouvre la feuille des membres du rôle. */
  onPress: () => void;
}

/** « 2 membres · 1 invitation · 1 accès coupé ». */
const summaryOf = (members: StaffMember[]) => {
  const invited = members.filter((m) => m.active && !m.userId).length;
  const suspended = members.filter((m) => !m.active).length;
  return [
    plural(members.length, "membre"),
    invited ? plural(invited, "invitation") : "",
    suspended ? plural(suspended, "accès coupé", "accès coupés") : "",
  ]
    .filter(Boolean)
    .join(" · ");
};

/**
 * Carte d'un rôle (maquette « Par rôle ») : nom, qui l'occupe, ce qu'il
 * permet. Sombre quand le rôle a toutes les permissions. Un appui ouvre la
 * feuille de ses membres (StaffRoleMembersSheet).
 */
export const StaffRoleCard: React.FC<Props> = ({
  role,
  members,
  catalog,
  onPress,
}) => {
  const permissions = role?.permissions || [];
  const dark = isFullAccess(permissions, catalog);
  const granted = grantedOf(permissions, catalog);
  const fg = dark ? "#fff" : ST.ink;
  const soft = dark ? "rgba(255,255,255,0.85)" : ST.muted;
  const ring = dark ? ST.ink : "#fff";

  return (
    <View style={[styles.card, dark ? styles.cardDark : styles.cardLight]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={role?.name || "Sans rôle"}
      >
        <View style={styles.row}>
          <Text style={[styles.name, { color: fg }]} numberOfLines={1}>
            {role?.name || "Sans rôle"}
          </Text>
          {dark ? (
            <View style={styles.fullPill}>
              <Text style={styles.fullPillText}>Accès complet</Text>
            </View>
          ) : (
            <Text style={styles.count}>
              {granted.length} / {catalog.length} permission{granted.length > 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <View style={styles.people}>
          {members.length === 0 ? (
            <Text style={[styles.peopleText, { color: soft }]}>Aucun membre</Text>
          ) : (
            <>
              <View style={styles.stack}>
                {members.slice(0, MAX_STACK).map((m, i) => (
                  <StaffAvatar
                    key={m.id}
                    label={memberInitials(m)}
                    size={34}
                    ringColor={ring}
                    variant={!m.active ? "muted" : !m.userId ? "invited" : dark ? "accent" : "light"}
                    style={i > 0 ? styles.stacked : undefined}
                  />
                ))}
                {members.length > MAX_STACK && (
                  <StaffAvatar
                    label={`+${members.length - MAX_STACK}`}
                    size={34}
                    ringColor={ring}
                    variant="white"
                    style={styles.stacked}
                  />
                )}
              </View>
              <Text style={[styles.peopleText, { color: soft }]} numberOfLines={1}>
                {summaryOf(members)}
              </Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <View style={[styles.seePill, { backgroundColor: dark ? "rgba(255,255,255,0.12)" : ST.surface }]}>
            <Text style={[styles.seeText, { color: fg }]}>Voir</Text>
          </View>
        </View>

        {dark ? (
          <View style={styles.segments}>
            {catalog.map((c) => (
              <View key={c.key} style={styles.segment} />
            ))}
          </View>
        ) : granted.length === 0 ? (
          <Text style={styles.noPerm}>Aucune permission</Text>
        ) : (
          <View style={styles.chips}>
            {granted.slice(0, MAX_CHIPS).map((p) => (
              <View key={p.key} style={styles.chip}>
                <Text style={styles.chipText}>{p.short}</Text>
              </View>
            ))}
            {granted.length > MAX_CHIPS && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>+{granted.length - MAX_CHIPS}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  cardDark: { backgroundColor: ST.ink },
  cardLight: { backgroundColor: "#fff", borderWidth: 1, borderColor: ST.line },
  head: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { flexShrink: 1, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  fullPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: "rgba(236,73,19,0.2)",
  },
  fullPillText: { fontSize: 12, fontWeight: "700", color: ST.accentOnInk },
  count: { fontSize: 12, fontWeight: "700", color: ST.muted },
  people: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 34 },
  peopleText: { flexShrink: 1, fontSize: 14, fontWeight: "600" },
  stack: { flexDirection: "row" },
  stacked: { marginLeft: -10 },
  segments: { flexDirection: "row", gap: 5 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: ST.accent },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: ST.surface,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: ST.ink },
  noPerm: { fontSize: 13, color: ST.faint },
  seePill: { height: 26, paddingHorizontal: 12, borderRadius: 13, justifyContent: "center" },
  seeText: { fontSize: 12.5, fontWeight: "700" },
});
