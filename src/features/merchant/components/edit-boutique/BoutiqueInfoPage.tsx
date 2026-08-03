import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";

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
  orderLeadTime: string;
  setOrderLeadTime: (v: string) => void;
  advanceDays: string;
  setAdvanceDays: (v: string) => void;
  onNext: () => void;
}

/** PAGE 1 : infos generales de la boutique (scroll + bouton "Suivant" fixe). */
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
  orderLeadTime,
  setOrderLeadTime,
  advanceDays,
  setAdvanceDays,
  onNext,
}) => (
  <View style={{ flex: 1 }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar + Name row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
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
      <View style={[styles.formRow, { marginTop: 10, gap: 6 }]}>
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
      <View style={[styles.formRow, { marginTop: 15, gap: 6 }]}>
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

      {/* Localisation - Villes */}
      <View style={[styles.inputGroup, { marginTop: 15 }]}>
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

      {/* Délai livraison */}
      <View style={[styles.inputGroup, { marginTop: 15 }]}>
        <Text style={styles.floatingLabel}>Délai livraison (minutes)</Text>
        <Text style={styles.helperText}>
          Les clients ne pourront plus commander X minutes avant l'heure de
          livraison
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

      {/* Jours en avance */}
      <View style={[styles.inputGroup, { marginTop: 15 }]}>
        <Text style={styles.floatingLabel}>Jours en avance</Text>
        <Text style={styles.helperText}>
          Nombre de jours à l'avance qu'un client peut commander (ex: 3 =
          aujourd'hui, demain, après-demain)
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
    </ScrollView>

    {/* Bouton Suivant fixe en bas */}
    <TouchableOpacity
      style={[styles.updateBtn, { marginTop: 16 }]}
      onPress={onNext}
    >
      <Text style={styles.updateBtnText}>Suivant</Text>
      <Ionicons name="arrow-forward-outline" size={18} color="white" />
    </TouchableOpacity>
  </View>
);
