import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
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
  onUpdatePress?: () => void;
}

/**
 * Écran plein écran, non fermable : la version du client est sous le
 * minimum requis (`forceUpdate` = true). Aucun bouton retour ni fermeture —
 * seule issue : mettre à jour.
 */
export default function ForceUpdateScreen({ onUpdatePress }: Props) {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [opening, setOpening] = React.useState(false);

  if (!fontsLoaded) return null;

  const handlePress = async () => {
    setOpening(true);
    try {
      await openStorePage();
    } finally {
      setOpening(false);
    }
    onUpdatePress?.();
  };

  return (
    <View style={styles.stage}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.iconWrap}>
        <Svg width={40} height={40} viewBox="0 0 24 24">
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

      <Text style={styles.title}>Mise à jour requise</Text>
      <Text style={styles.subtitle}>
        Une nouvelle version de yaammoo est nécessaire pour continuer.{"\n"}
        Mets à jour l'application pour poursuivre.
      </Text>

      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={opening}
      >
        {opening ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.btnText}>Mettre à jour</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#f7f5f4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0c8a5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 24,
    color: "#141414",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
    color: "#5a5350",
    textAlign: "center",
    marginBottom: 32,
  },
  btn: {
    backgroundColor: "#141414",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 200,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#ffffff",
  },
});
