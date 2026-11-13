"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de StaffRoleMembersSheet (R16) pour la carte « Livreurs » de Personnel :
// les livreurs en lignes blanches dans un bloc gris ; « Gérer » ouvre la page Livreurs.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DriverInfo } from "@/src/features/driver/services/driverService";
import { DEFAULT_DIAL, formatPhone, initialsOf, personName, plural } from "../utils/staffFormat";
import { StaffAvatar } from "./StaffAvatar";
import { StaffSheet } from "./StaffSheet";
import { ST } from "./staffTheme";
import { t, useLanguage } from "@/src/i18n";

const contactOf = (infos?: DriverInfo["infos"]) => {
  const digits = infos?.numero ? String(infos.numero).replace(/\D/g, "") : "";
  return digits.length === 9 ? formatPhone(`${DEFAULT_DIAL}${digits}`) : infos?.email || "";
};

export const StaffDriversSheet: React.FC<{ drivers: DriverInfo[]; onManage: () => void; onClose: () => void }> = ({ drivers, onManage, onClose }) => {
  useLanguage();
  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{t("Livreurs")}</Text>
        <Text style={styles.sub}>{plural(drivers.length, t("livreur"))}</Text>
      </View>
      <Pressable onPress={onManage} hitSlop={8} style={styles.edit} accessibilityRole="button">
        <Ionicons name="options-outline" size={15} color={ST.ink} />
        <Text style={styles.editText}>{t("Gérer")}</Text>
      </Pressable>
    </View>
  );
  return (
    <StaffSheet onClose={onClose} header={header}>
      <View style={styles.group}>
        <View style={styles.groupHead}>
          <Text style={styles.groupName}>{t("Livreurs")}</Text>
          <Text style={styles.groupSummary}>{t("Commandes déléguées")}</Text>
        </View>
        {drivers.map((d) => {
          const name = personName(d.infos);
          return (
            <View key={d.driverId} style={styles.row}>
              <StaffAvatar label={initialsOf(name)} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.sub} numberOfLines={1}>{contactOf(d.infos)}</Text>
              </View>
            </View>
          );
        })}
        {drivers.length === 0 && (
          <View style={styles.row}>
            <Text style={styles.sub}>{t("Aucun livreur pour le moment")}</Text>
          </View>
        )}
      </View>
    </StaffSheet>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: ST.ink },
  sub: { fontSize: 13, color: ST.muted },
  edit: { height: 34, paddingHorizontal: 12, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: ST.surface },
  editText: { fontSize: 13, fontWeight: "700", color: ST.ink },
  group: { backgroundColor: ST.surface, borderRadius: 22, padding: 6, gap: 4 },
  groupHead: { height: 32, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  groupName: { fontSize: 14, fontWeight: "800", color: ST.ink },
  groupSummary: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: ST.muted },
  row: { minHeight: 60, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 15, fontWeight: "700", color: ST.ink },
});
