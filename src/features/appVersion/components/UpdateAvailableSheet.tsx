import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  useFonts,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { openStorePage } from "@/src/features/appVersion/services/storeLinks";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Sheet non bloquante : une nouvelle version existe (`updateAvailable`), mais
 * le client n'est pas sous le minimum requis. L'utilisateur choisit de mettre
 * à jour maintenant ou de continuer sans le faire.
 */
export default function UpdateAvailableSheet({ visible, onDismiss }: Props) {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [opening, setOpening] = React.useState(false);

  if (!fontsLoaded) return null;

  const handleUpdate = async () => {
    setOpening(true);
    try {
      await openStorePage();
    } finally {
      setOpening(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
                stroke="#141414"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>

          <Text style={styles.title}>Nouvelle version disponible</Text>
          <Text style={styles.subtitle}>
            Une nouvelle version de yaammoo est disponible. Mets à jour pour
            profiter des dernières améliorations.
          </Text>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={handleUpdate}
            disabled={opening}
          >
            {opening ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Mettre à jour</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.7}
            onPress={onDismiss}
          >
            <Text style={styles.btnSecondaryText}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,20,20,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0c8a5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 19,
    color: "#141414",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: "#5a5350",
    textAlign: "center",
    marginBottom: 24,
  },
  btnPrimary: {
    backgroundColor: "#141414",
    paddingVertical: 14,
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  btnPrimaryText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#ffffff",
  },
  btnSecondary: {
    paddingVertical: 10,
    alignItems: "center",
  },
  btnSecondaryText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#8a8380",
  },
});
