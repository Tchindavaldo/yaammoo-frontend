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
  /**
   * `false` = mise à jour simplement DISPONIBLE : le message s'adoucit et un
   * bouton « Plus tard » permet de rejoindre la home. `true` (défaut) = version
   * sous le minimum requis, aucune issue hors mise à jour.
   */
  mandatory?: boolean;
  /** Appelé au tap sur « Plus tard ». Requis quand `mandatory` est false. */
  onDismiss?: () => void;
}

/**
 * Écran plein écran de mise à jour, utilisé pour les DEUX cas — blocage et
 * simple disponibilité. Une seule page : seuls le texte et la présence du
 * bouton « Plus tard » changent, pour que l'utilisateur voie toujours la même
 * mise en page quelle que soit la situation.
 */
export default function ForceUpdateScreen({
  onUpdatePress,
  mandatory = true,
  onDismiss,
}: Props) {
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

      <Text style={styles.title}>
        {mandatory ? "Mise à jour requise" : "Nouvelle version disponible"}
      </Text>
      <Text style={styles.subtitle}>
        {mandatory
          ? `Une nouvelle version de yaammoo est nécessaire pour continuer.\nMets à jour l'application pour poursuivre.`
          : `Une nouvelle version de yaammoo est disponible.\nMets à jour pour profiter des dernières améliorations.`}
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

      {!mandatory && (
        <TouchableOpacity
          style={styles.laterBtn}
          activeOpacity={0.7}
          onPress={onDismiss}
          disabled={opening}
        >
          <Text style={styles.laterText}>Plus tard</Text>
        </TouchableOpacity>
      )}
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
  laterBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  laterText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: "#8a827e",
  },
});
