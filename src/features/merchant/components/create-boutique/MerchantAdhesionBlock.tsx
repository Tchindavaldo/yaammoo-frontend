"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Formulaire d'adhesion du Marchand (Annexe 3 des CGU) : qualite, denomination
// legale (facultative), adresse de la boutique et case d'acceptation. Le nom,
// le nom de la boutique, le secteur et la date sont poses par le backend.
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";

export type RepresentativeRole = "gerant" | "directeur" | "proprietaire";
const ROLES: { key: RepresentativeRole; label: string }[] = [
  { key: "gerant", label: "Gérant" },
  { key: "directeur", label: "Directeur" },
  { key: "proprietaire", label: "Propriétaire" },
];

interface Props {
  role: RepresentativeRole | null;
  setRole: (r: RepresentativeRole) => void;
  legalName: string;
  setLegalName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  onOpenLegal: () => void;
}

export function MerchantAdhesionBlock(p: Props) {
  useLanguage();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t("Votre qualité")}</Text>
      <View style={styles.roles}>
        {ROLES.map(r => {
          const on = p.role === r.key;
          return (
            <TouchableOpacity key={r.key} style={[styles.chip, on && styles.chipOn]} onPress={() => p.setRole(r.key)} activeOpacity={0.8}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(r.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.label}>{t("Dénomination légale de l'entreprise (facultatif)")}</Text>
      <TextInput style={styles.input} value={p.legalName} onChangeText={p.setLegalName} placeholder={t("Ex. : RAUVAL SARL")} placeholderTextColor={DS.muted} />
      <Text style={styles.label}>{t("Adresse de la boutique")}</Text>
      <TextInput style={styles.input} value={p.address} onChangeText={p.setAddress} placeholder={t("Quartier, rue, repère")} placeholderTextColor={DS.muted} />
      <TouchableOpacity style={styles.row} onPress={() => p.setAccepted(!p.accepted)} activeOpacity={0.7}>
        <View style={[styles.box, p.accepted && styles.boxOn]}>{p.accepted && <Ionicons name="checkmark" size={14} color={DS.onInk} />}</View>
        <Text style={styles.checkText}>
          {t("J'ai lu et j'accepte les Conditions générales, l'Annexe 1 (Marchands) et les conditions des Partenaires de paiement. Cette validation vaut signature.")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={p.onOpenLegal} hitSlop={8}>
        <Text style={styles.link}>{t("Lire les conditions")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: DS.slate50, borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: DS.slate200, gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: DS.ink },
  roles: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: DS.slate200, alignItems: "center", backgroundColor: DS.bg },
  chipOn: { borderColor: DS.accent, backgroundColor: DS.accentTint },
  chipText: { fontSize: 13, color: DS.text2, fontWeight: "600" },
  chipTextOn: { color: DS.accentText },
  input: { borderWidth: 1, borderColor: DS.slate200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: DS.ink, backgroundColor: DS.bg },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 6 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: DS.slate300, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { borderColor: DS.accent, backgroundColor: DS.accent },
  checkText: { flex: 1, fontSize: 13, lineHeight: 18, color: DS.text2 },
  link: { fontSize: 13, fontWeight: "700", color: DS.accentText, marginLeft: 32 },
});
