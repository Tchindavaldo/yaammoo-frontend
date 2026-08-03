import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "./styles";
import { CAMEROON_CITIES } from "./constants";

/** Overlay iOS-like contenant un DateTimePicker "time". */
export const TimePickerOverlay: React.FC<{
  value: Date;
  onChange: (d: Date) => void;
  onDone: () => void;
}> = ({ value, onChange, onDone }) => (
  <Modal transparent={true} visible={true} animationType="fade">
    <View style={styles.modalOverlay}>
      <BlurView intensity={90} tint="dark" style={styles.iosPickerContainer}>
        <TouchableOpacity style={styles.iosPickerDone} onPress={onDone}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Terminer</Text>
        </TouchableOpacity>
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour={true}
          display="spinner"
          textColor="white"
          onChange={(e, d) => d && onChange(d)}
        />
      </BlurView>
    </View>
  </Modal>
);

/** Selecteur multiple des villes de livraison, avec recherche. */
export const CityPickerModal: React.FC<{
  search: string;
  setSearch: (v: string) => void;
  selectedCities: string[];
  setSelectedCities: (fn: (prev: string[]) => string[]) => void;
  onDone: () => void;
}> = ({ search, setSearch, selectedCities, setSelectedCities, onDone }) => (
  <Modal transparent={true} visible={true} animationType="fade">
    <View style={styles.modalOverlay}>
      <BlurView intensity={90} tint="dark" style={styles.iosPickerContainer}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
              Villes de livraison
            </Text>
            <TouchableOpacity onPress={onDone}>
              <Text style={{ color: "#ec4913", fontWeight: "bold" }}>
                Terminer
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 40,
              color: "white",
              fontSize: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
            }}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une ville…"
            placeholderTextColor="#94a3b8"
          />
        </View>
        <ScrollView
          style={{ maxHeight: 320 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {CAMEROON_CITIES.filter((city) =>
            city.toLowerCase().includes(search.toLowerCase()),
          ).map((city) => {
            const isSelected = selectedCities.includes(city);
            return (
              <TouchableOpacity
                key={city}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.08)",
                }}
                onPress={() =>
                  setSelectedCities((prev) =>
                    prev.includes(city)
                      ? prev.filter((c) => c !== city)
                      : [...prev, city],
                  )
                }
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isSelected ? "#10b981" : "#64748b",
                    backgroundColor: isSelected ? "#10b981" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={{ color: "white", fontSize: 15 }}>{city}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BlurView>
    </View>
  </Modal>
);

/** Toast global (succes / erreur) anime depuis le haut. */
export const BoutiqueToast: React.FC<{
  config: { message: string; type: string };
  animY: Animated.Value;
}> = ({ config, animY }) => (
  <Animated.View
    style={[
      styles.toastContainer,
      config.type === "error" ? styles.toastError : styles.toastSuccess,
      { transform: [{ translateY: animY }] },
    ]}
  >
    <Ionicons
      name={config.type === "success" ? "checkmark-circle" : "alert-circle"}
      size={24}
      color="white"
    />
    <Text style={styles.toastText}>{config.message}</Text>
  </Animated.View>
);
