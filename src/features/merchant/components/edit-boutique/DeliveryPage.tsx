import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { DeliveryZoneList } from "./DeliveryZoneList";
import type { ZoneGroup, ZoneHourEntry } from "./groupZones";
import { styles } from "./styles";

interface DeliveryPageProps {
  hasHours: boolean;
  groups: ZoneGroup[];
  selectedHour: string | null;
  selectedLieu: string | null;
  onSelectZone: (lieu: string, entry: ZoneHourEntry) => void;
  onAddAddress: () => void;
  pickupAllowed: boolean;
  setPickupAllowed: (v: boolean) => void;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

/** PAGE 2 : zones de livraison + retrait boutique (boutons fixes en bas). */
export const DeliveryPage: React.FC<DeliveryPageProps> = ({
  hasHours,
  groups,
  selectedHour,
  selectedLieu,
  onSelectZone,
  onAddAddress,
  pickupAllowed,
  setPickupAllowed,
  loading,
  onBack,
  onSubmit,
}) => (
  <View style={{ flex: 1 }}>
    {/* Zone extensible : la carte des adresses occupe tout l'espace libre
        restant au-dessus de la carte "retrait boutique". */}
    <View style={{ flex: 1, paddingBottom: 12 }}>
      {/* Récap livraison : carte liste des adresses */}
      {hasHours && (
        <View
          style={{
            flex: 1,
            borderRadius: 14,
            // backgroundColor: "green",
            marginBottom: 10,
          }}
        >
          {/* En-tete : titre sur 2 lignes a gauche, bouton d'ajout a droite */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              // backgroundColor: "green",
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                fontWeight: "bold",
                color: "#0f172a",
              }}
            >
              {"Vos adresses et\nheures de livraison"}
            </Text>
            <TouchableOpacity
              onPress={onAddAddress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "#ec4913",
                flexShrink: 1,
              }}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 14 }}
                numberOfLines={1}
              >
                Ajouter
              </Text>
            </TouchableOpacity>
          </View>

          <DeliveryZoneList
            groups={groups}
            selectedHour={selectedHour}
            selectedLieu={selectedLieu}
            onSelect={onSelectZone}
          />
        </View>
      )}

      {/* Carte récupération à la boutique */}
      <View
        style={{
          backgroundColor: "#f8fafc",
          borderRadius: 14,
          padding: 14,
          marginTop: 0,
          borderWidth: 1,
          borderColor: "#e2e8f0",
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          onPress={() => setPickupAllowed(!pickupAllowed)}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: pickupAllowed ? "#10b981" : "#cbd5e1",
              backgroundColor: pickupAllowed ? "#10b981" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pickupAllowed && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
          <Text
            style={{
              fontSize: 13,
              color: pickupAllowed ? "#10b981" : "#475569",
              fontWeight: "600",
              flexShrink: 1,
            }}
          >
            Le client peut passer à la boutique récupérer la commande
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Boutons navigation (fixes en bas) */}
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        marginBottom: 4,
      }}
    >
      <TouchableOpacity
        style={[
          styles.updateBtn,
          { flex: 1, marginTop: 0, backgroundColor: "#64748b" },
        ]}
        onPress={onBack}
      >
        <Ionicons name="arrow-back-outline" size={18} color="white" />
        <Text style={styles.updateBtnText}>Retour</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.updateBtn, { flex: 1, marginTop: 0 }]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color="white" />
            <Text style={styles.updateBtnText}>Mettre à jour</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
);
