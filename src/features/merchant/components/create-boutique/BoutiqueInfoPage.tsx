import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./styles";

/**
 * Page unique du formulaire de CREATION de boutique.
 *
 * Copie dediee de `edit-boutique/BoutiqueInfoPage` (R16 : on duplique, on ne
 * partage pas). Seule difference a ce jour : le bouton du bas cree la boutique
 * au lieu de la mettre a jour.
 */

interface BoutiqueInfoPageProps {
  image: string;
  pickImage: () => void;
  name: string;
  setName: (v: string) => void;
  openTime: Date;
  closeTime: Date;
  formatTime: (d: Date) => string;
  onOpenTimePress: () => void;
  onCloseTimePress: () => void;
  number: string;
  setNumber: (v: string) => void;
  momoNumber: string;
  setMomoNumber: (v: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (v: string) => void;
  selectedCities: string[];
  onCityPress: () => void;
  /** Ouvre le bottom sheet d'ajout d'une zone de livraison. */
  onAddZone: () => void;
  /** Ouvre le bottom sheet listant les zones existantes. */
  onViewZones: () => void;
  orderLeadTime: string;
  setOrderLeadTime: (v: string) => void;
  advanceDays: string;
  setAdvanceDays: (v: string) => void;
  pickupAllowed: boolean;
  setPickupAllowed: (v: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
  /** Hauteur du header au-dessus (TabHeader), pour caler le KeyboardAvoidingView. */
  keyboardOffset?: number;
}

/** Formulaire boutique : infos generales (scroll + bouton de validation fixe). */
export const BoutiqueInfoPage: React.FC<BoutiqueInfoPageProps> = ({
  image,
  pickImage,
  name,
  setName,
  openTime,
  closeTime,
  formatTime,
  onOpenTimePress,
  onCloseTimePress,
  number,
  setNumber,
  momoNumber,
  setMomoNumber,
  whatsappNumber,
  setWhatsappNumber,
  selectedCities,
  onCityPress,
  onAddZone,
  onViewZones,
  orderLeadTime,
  setOrderLeadTime,
  advanceDays,
  setAdvanceDays,
  pickupAllowed,
  setPickupAllowed,
  loading,
  onSubmit,
  keyboardOffset = 0,
}) => (
  <View style={{ flex: 1 }}>
    {/* Pas de KeyboardAvoidingView : sa hauteur animee ferait bouger le
        space-between ci-dessous. Le ScrollView natif (keyboardShouldPersistTaps)
        suffit a scroller manuellement vers un input cache par le clavier. */}
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: 16,
        flexGrow: 1,
        justifyContent: "space-between",
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar + Name row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={pickImage} style={styles.avatarCircle}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="image-outline" size={28} color="#cbd5e1" />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>Nom Boutique</Text>
          <TextInput
            style={[styles.glassInput, { borderRadius: 20 }]}
            value={name}
            onChangeText={setName}
            placeholder="Entrer le nom de votre boutique"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Heures ouverture/fermeture sur une ligne */}
      <View style={[styles.formRow, { marginTop: 16, gap: 6 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>Ouverture</Text>
          <TouchableOpacity
            style={[styles.glassInput, styles.timeInput, { borderRadius: 20 }]}
            onPress={onOpenTimePress}
          >
            <Text style={styles.timeText}>{formatTime(openTime)}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>Fermeture</Text>
          <TouchableOpacity
            style={[styles.glassInput, styles.timeInput, { borderRadius: 20 }]}
            onPress={onCloseTimePress}
          >
            <Text style={styles.timeText}>{formatTime(closeTime)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Numéros de contact sur une ligne */}
      <View style={[styles.formRow, { marginTop: 16, gap: 6 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>OM</Text>
          <TextInput
            style={[styles.glassInput, { borderRadius: 20 }]}
            value={number}
            onChangeText={setNumber}
            keyboardType="numeric"
            placeholder="Orange Money"
            placeholderTextColor="#cbd5e1"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>MOMO</Text>
          <TextInput
            style={[styles.glassInput, { borderRadius: 20 }]}
            value={momoNumber}
            onChangeText={setMomoNumber}
            keyboardType="numeric"
            placeholder="MTN Mobile Money"
            placeholderTextColor="#cbd5e1"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>WhatsApp</Text>
          <TextInput
            style={[styles.glassInput, { borderRadius: 20 }]}
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="numeric"
            placeholder="WhatsApp"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Délai livraison + jours en avance sur une ligne */}
      <View style={[styles.formRow, { marginTop: 16, gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>Délai livraison (minutes)</Text>
          <Text style={styles.helperText}>
            Temps limite pour commander avant le créneau (ex: 30 = bloqué 30 min avant)
          </Text>
          <TextInput
            style={[styles.glassInput, { borderRadius: 20 }]}
            value={orderLeadTime}
            onChangeText={setOrderLeadTime}
            keyboardType="numeric"
            placeholder="ex: 30"
            placeholderTextColor="#cbd5e1"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.floatingLabel}>Jours en avance</Text>
          <Text style={styles.helperText}>
            Nombre de jours réservables à l'avance (ex: 3 = aujourd'hui à après-demain)
          </Text>
          <TextInput
            style={[styles.glassInput, { borderRadius: 20 }]}
            value={advanceDays}
            onChangeText={setAdvanceDays}
            keyboardType="numeric"
            placeholder="ex: 3"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Localisation (villes) + acces aux zones de livraison sur une ligne */}
      <View style={[styles.formRow, { marginTop: 16, gap: 10 }]}>
        <View style={[styles.inputGroup, { flex: 1, marginTop: 0 }]}>
          <Text style={styles.floatingLabel}>
            Localisation
            {selectedCities.length > 0 ? ` (${selectedCities.length})` : ""}
          </Text>
          <TouchableOpacity
            style={[
              styles.glassInput,
              {
                borderRadius: 20,
                minHeight: 46,
                justifyContent: "center",
                paddingVertical: 10,
              },
            ]}
            onPress={onCityPress}
          >
            {selectedCities.length > 0 ? (
              <Text style={{ color: "#334155", fontSize: 14 }} numberOfLines={2}>
                {selectedCities.join(", ")}
              </Text>
            ) : (
              <Text style={{ color: "#cbd5e1", fontSize: 14 }}>
                Sélectionner les villes de livraison
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ width: 120 }}>
          <Text style={styles.floatingLabel} numberOfLines={2}>
            Zone de livraison
          </Text>
          <View style={{ flexDirection: "row", gap: 8, minHeight: 46 }}>
            <TouchableOpacity
              style={[
                styles.glassInput,
                {
                  flex: 1,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 0,
                },
              ]}
              onPress={onAddZone}
            >
              <Ionicons name="add" size={20} color="#ec4913" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.glassInput,
                {
                  flex: 1,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 0,
                },
              ]}
              onPress={onViewZones}
            >
              <Ionicons name="eye-outline" size={20} color="#334155" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Récupération à la boutique (déplacé depuis la page 2) */}
      <View
        style={{
          backgroundColor: "#f8fafc",
          borderRadius: 14,
          padding: 14,
          marginTop: 16,
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
    </ScrollView>

    {/* Bouton de validation fixe en bas */}
    <TouchableOpacity
      // styles.updateBtn a marginTop: 28 ; on l'ecrase pour un espacement
      // regulier avec les autres lignes du formulaire (16).
      style={[styles.updateBtn, { marginTop: 16 }]}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <Ionicons name="storefront-outline" size={18} color="white" />
          <Text style={styles.updateBtnText}>Créer ma boutique</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);
