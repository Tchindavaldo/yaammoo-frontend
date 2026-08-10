import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
} from "react-native";
import { useSheetAnimation } from "./useSheetAnimation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "./styles";
import { hourToDate, type Zone } from "./parseBoutique";

interface ZoneFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Heure en cours d'edition ; null = ajout d'une nouvelle adresse. */
  activeHour: string | null;
  newHour: string;
  setNewHour: (v: string) => void;
  formPeriodic: boolean;
  setFormPeriodic: (fn: (v: boolean) => boolean) => void;
  formExpress: boolean;
  setFormExpress: (fn: (v: boolean) => boolean) => void;
  periodicDraft: Zone;
  setPeriodicDraft: (z: Zone) => void;
  expressDraft: Zone;
  setExpressDraft: (z: Zone) => void;
  tempDeliveryTime: Date;
  setTempDeliveryTime: (d: Date) => void;
  showTimePicker: boolean;
  setShowTimePicker: (v: boolean) => void;
  onDelete: () => void;
  onSave: (hour: string) => void;
  fallbackHour: string;
}

/** Bottom sheet d'ajout / edition d'une adresse de livraison. */
export const ZoneFormSheet: React.FC<ZoneFormSheetProps> = ({
  visible,
  onClose,
  activeHour,
  newHour,
  setNewHour,
  formPeriodic,
  setFormPeriodic,
  formExpress,
  setFormExpress,
  periodicDraft,
  setPeriodicDraft,
  expressDraft,
  setExpressDraft,
  tempDeliveryTime,
  setTempDeliveryTime,
  showTimePicker,
  setShowTimePicker,
  onDelete,
  onSave,
  fallbackHour,
}) => {
  const insets = useSafeAreaInsets();
  const hr = activeHour || newHour;
  const { mounted, backdropOpacity, translateY } = useSheetAnimation(visible);

  if (!mounted) return null;

  return (
    <Modal transparent={true} visible={mounted} animationType="none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(15,23,42,0.4)",
              opacity: backdropOpacity,
            }}
          />
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View
            style={{
              transform: [{ translateY }],
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              // Dégage la barre de navigation système.
              paddingBottom: 28 + insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a" }}
              >
                {activeHour ? "Modifier" : "Ajouter"} une adresse
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Cocher périodique / express */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <ModeCheckbox
                  label="Périodique"
                  checked={formPeriodic}
                  onPress={() => setFormPeriodic((v) => !v)}
                />
                <ModeCheckbox
                  label="Express"
                  checked={formExpress}
                  onPress={() => setFormExpress((v) => !v)}
                />
              </View>

              {/* Heure + prix périodique + prix express sur une même ligne */}
              <View style={[styles.inputGroup, { marginTop: 14 }]}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.floatingLabel}>Heure</Text>
                    <TouchableOpacity
                      style={[
                        styles.glassInput,
                        styles.timeInput,
                        { borderRadius: 20 },
                      ]}
                      onPress={() => {
                        if (activeHour) {
                          setNewHour(activeHour);
                          setTempDeliveryTime(hourToDate(activeHour));
                        }
                        setShowTimePicker(true);
                      }}
                    >
                      <Text style={styles.timeText}>{newHour || "--:--"}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.floatingLabel}>Périodique</Text>
                    <TextInput
                      style={[styles.glassInput, { borderRadius: 20 }]}
                      value={periodicDraft.prix}
                      onChangeText={(t) =>
                        setPeriodicDraft({ ...periodicDraft, prix: t })
                      }
                      keyboardType="numeric"
                      placeholder="Prix"
                      placeholderTextColor="#cbd5e1"
                      editable={formPeriodic}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.floatingLabel}>Express</Text>
                    <TextInput
                      style={[styles.glassInput, { borderRadius: 20 }]}
                      value={expressDraft.prix}
                      onChangeText={(t) =>
                        setExpressDraft({ ...expressDraft, prix: t })
                      }
                      keyboardType="numeric"
                      placeholder="Prix"
                      placeholderTextColor="#cbd5e1"
                      editable={formExpress}
                    />
                  </View>
                </View>
              </View>

              {/* Localisation + boutons delete/valider */}
              <View style={[styles.inputGroup, { marginTop: 14 }]}>
                <Text style={styles.floatingLabel}>Localisation</Text>
                <View style={styles.editRow}>
                  <TextInput
                    style={[
                      styles.glassInput,
                      styles.editInput,
                      { flex: 1, borderRadius: 20 },
                    ]}
                    value={periodicDraft.lieu || expressDraft.lieu}
                    onChangeText={(t) => {
                      setPeriodicDraft({ ...periodicDraft, lieu: t });
                      setExpressDraft({ ...expressDraft, lieu: t });
                    }}
                    placeholder="Zone / quartier"
                    placeholderTextColor="#cbd5e1"
                  />
                  <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={18} color="#dc3545" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.validateBtn]}
                    onPress={() => onSave(hr || fallbackHour)}
                  >
                    <Ionicons name="checkmark" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>

          {/* Time picker intégré au bottom sheet (évite l'empilement de 2 Modals) */}
          {showTimePicker && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                top: 0,
                justifyContent: "flex-end",
                backgroundColor: "rgba(15,23,42,0.4)",
              }}
            >
              <View
                style={{
                  backgroundColor: "#1e293b",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  // Dégage la barre de navigation système.
                  paddingBottom: 24 + insets.bottom,
                }}
              >
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ color: "#ec4913", fontWeight: "bold" }}>
                    Sélectionner
                  </Text>
                </TouchableOpacity>
                <DateTimePicker
                  value={tempDeliveryTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  textColor="white"
                  onChange={(e, d) => {
                    if (d) {
                      setTempDeliveryTime(d);
                      setNewHour(
                        d.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }),
                      );
                    }
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/** Case a cocher "carte" pour un mode de livraison (periodique / express). */
const ModeCheckbox: React.FC<{
  label: string;
  checked: boolean;
  onPress: () => void;
}> = ({ label, checked, onPress }) => (
  <TouchableOpacity
    style={{
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: checked ? "#ecfdf5" : "#f8fafc",
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: checked ? "#10b981" : "#e2e8f0",
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: checked ? "#10b981" : "#cbd5e1",
        backgroundColor: checked ? "#10b981" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <Ionicons name="checkmark" size={14} color="white" />}
    </View>
    <Text
      style={{
        fontSize: 12,
        fontWeight: "600",
        color: checked ? "#047857" : "#475569",
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
