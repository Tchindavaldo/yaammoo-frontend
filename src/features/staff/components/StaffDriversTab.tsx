import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  DriverApplication,
  DriverInfo,
  DriverProfile,
  UserInfos,
} from "@/src/features/driver/services/driverService";
import { useStaffDriverProfiles } from "../hooks/useStaffDriverProfiles";
import { DEFAULT_DIAL, formatPhone, initialsOf, personName, timeAgo } from "../utils/staffFormat";
import { StaffAvatar } from "./StaffAvatar";
import { ST } from "./staffTheme";

interface Props {
  applications: DriverApplication[];
  drivers: DriverInfo[];
  loaded: boolean;
  deciding: Record<string, boolean>;
  removingId: string | null;
  onDecide: (app: DriverApplication, decision: "accepted" | "refused") => void;
  onRemove: (driver: DriverInfo) => void;
}

/** Numéro du profil (9 chiffres locaux) formaté, sinon l'email. */
const contactOf = (infos?: UserInfos) => {
  const digits = infos?.numero ? String(infos.numero).replace(/\D/g, "") : "";
  if (digits.length === 9) return formatPhone(`${DEFAULT_DIAL}${digits}`);
  return infos?.email || "";
};

/** « 4,8 · 128 livrées » ou « Pas encore noté · 3 livrées ». */
const statsLine = (p: DriverProfile) => {
  const rating = p.ratingCount
    ? (p.ratingAvg ?? 0).toFixed(1).replace(".", ",")
    : "Pas encore noté";
  const n = p.stats?.delivered ?? 0;
  return `${rating} · ${n} livrée${n > 1 ? "s" : ""}`;
};

/**
 * Onglet Livreurs de l'écran Personnel : demandes reçues (accepter /
 * refuser) puis les livreurs de la boutique (retirer).
 */
export const StaffDriversTab: React.FC<Props> = ({
  applications,
  drivers,
  loaded,
  deciding,
  removingId,
  onDecide,
  onRemove,
}) => {
  const profiles = useStaffDriverProfiles(drivers);

  if (!loaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={ST.accent} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.block, { backgroundColor: ST.accentWash }]}>
        <View style={styles.blockHead}>
          <Text style={styles.blockTitle}>Demandes reçues</Text>
          {applications.length > 0 && (
            <Text style={styles.blockHint}>{applications.length} en attente</Text>
          )}
        </View>
        {applications.length === 0 ? (
          <Text style={styles.empty}>Aucune demande en attente</Text>
        ) : (
          applications.map((app) => {
            const name = personName(app.user?.infos);
            return (
              <View key={app.id} style={styles.row}>
                <StaffAvatar label={initialsOf(name)} />
                <View style={styles.texts}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {timeAgo(app.updatedAt || app.createdAt) || contactOf(app.user?.infos)}
                  </Text>
                </View>
                {deciding[app.id] ? (
                  <ActivityIndicator color={ST.accent} />
                ) : (
                  <>
                    <Pressable
                      onPress={() => onDecide(app, "refused")}
                      style={styles.roundBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Refuser ${name}`}
                    >
                      <Ionicons name="close" size={16} color={ST.ink} />
                    </Pressable>
                    <Pressable
                      onPress={() => onDecide(app, "accepted")}
                      style={styles.acceptBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Accepter ${name}`}
                    >
                      <Text style={styles.acceptText}>Accepter</Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.block, { backgroundColor: ST.surface }]}>
        <View style={styles.blockHead}>
          <Text style={styles.blockTitle}>Mes livreurs</Text>
          <Text style={[styles.blockHint, { color: ST.muted, fontWeight: "600" }]}>
            Commandes déléguées
          </Text>
        </View>
        {drivers.length === 0 ? (
          <Text style={styles.empty}>Aucun livreur pour le moment</Text>
        ) : (
          drivers.map((d) => {
            const name = personName(d.infos);
            const p = profiles[d.driverId];
            return (
              <View key={d.driverId} style={styles.row}>
                <StaffAvatar label={initialsOf(name)} />
                <View style={styles.texts}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <View style={styles.subRow}>
                    {!!p?.ratingCount && <Ionicons name="star" size={12} color={ST.accent} />}
                    <Text style={styles.sub} numberOfLines={1}>
                      {p ? statsLine(p) : contactOf(d.infos)}
                    </Text>
                  </View>
                </View>
                {removingId === d.driverId ? (
                  <ActivityIndicator color={ST.danger} />
                ) : (p?.stats?.inProgress ?? 0) > 0 ? (
                  <Pressable
                    onPress={() => onRemove(d)}
                    style={styles.chip}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}, en course. Retirer`}
                  >
                    <Text style={styles.chipText}>En course</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => onRemove(d)}
                    style={styles.roundBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${name}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={ST.danger} />
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  loader: { paddingVertical: 48, alignItems: "center" },
  block: { borderRadius: 22, padding: 6, gap: 4 },
  blockHead: {
    height: 32,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockTitle: { fontSize: 14, fontWeight: "800", color: ST.ink },
  blockHint: { fontSize: 12, fontWeight: "700", color: ST.accentText },
  empty: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 13, color: ST.muted },
  row: {
    minHeight: 64,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: ST.ink },
  sub: { flexShrink: 1, fontSize: 13, color: ST.muted },
  subRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  chip: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: ST.accentTint,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: ST.accentText },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.surface,
  },
  acceptBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: ST.ink,
  },
  acceptText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
