// Bottom sheet « Mes comptes » (maquette « 2 comptes · menu ouvert ») :
// liste des comptes (courant coche), ajouter un compte, se deconnecter
// (meme logique et loader que LogoutModal, via useLogout), annuler.
// Pas de fermeture au tap hors de la sheet : seul « Annuler » la ferme.
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { AccountEntry } from "../hooks/useAccounts";
import { useLogout } from "../hooks/useLogout";

const AVATAR_BG = [DS.accent, DS.text2];

interface Props {
  visible: boolean;
  accounts: AccountEntry[];
  onClose: () => void;
  onSelect: (account: AccountEntry) => void;
  onAddAccount: () => void;
}

export function AccountSheet({
  visible,
  accounts,
  onClose,
  onSelect,
  onAddAccount,
}: Props) {
  const insets = useSheetSafeInsets();
  const { isLoggingOut, logout } = useLogout();

  // Animation maison : voile en fondu + sheet qui monte (0 = fermee, 1 = ouverte).
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(400);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // Fermee sans « Annuler » (selection, ajout) : demontage direct.
      setMounted(false);
    }
  }, [visible, progress]);

  const cancel = () => {
    if (isLoggingOut) return;
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetH, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      // "none" : l'animation est faite ici. Au logout la sheet n'est jamais
      // fermee, le demontage de settings l'arrache sans fondu.
      animationType="none"
      onRequestClose={cancel}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: progress }]} />
      <Animated.View
        onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>
          {accounts.length > 1 ? "Mes comptes" : "Mon compte"}
        </Text>

        {accounts.map((a, i) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.row, a.current && styles.rowCurrent]}
            onPress={() => onSelect(a)}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: AVATAR_BG[i % AVATAR_BG.length] },
              ]}
            >
              <Text style={styles.avatarText}>{a.initiale}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {a.nom}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {[a.isMarchand ? "Marchand" : "", a.contact]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            {a.current && (
              <Ionicons name="checkmark" size={20} color={DS.accent} />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.row}
          onPress={onAddAccount}
          disabled={isLoggingOut}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, styles.addAvatar]}>
            <Ionicons name="add" size={18} color={DS.muted} />
          </View>
          <Text style={styles.name}>Ajouter un compte</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.cancel]}
            onPress={cancel}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.logout]}
            onPress={logout}
            disabled={isLoggingOut}
            activeOpacity={0.8}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={DS.dangerInk} size="small" />
            ) : (
              <>
                <Ionicons name="exit-outline" size={18} color={DS.dangerInk} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Voile plein ecran et sheet en absolu : quand la sheet glisse, le voile
  // couvre aussi la zone qu'elle libere (sinon on y voyait la page blanche).
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: DS.backdrop },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: DS.track,
    alignSelf: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: DS.ink,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowCurrent: { backgroundColor: DS.accentWash },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: DS.onInk, fontSize: 15, fontWeight: "800" },
  addAvatar: {
    backgroundColor: DS.bg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: DS.idle,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700", color: DS.ink },
  sub: { fontSize: 12, color: DS.muted, marginTop: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logout: { backgroundColor: DS.accentSoft },
  logoutText: { fontSize: 15, fontWeight: "700", color: DS.dangerInk },
  cancel: { backgroundColor: DS.surface },
  cancelText: { fontSize: 15, fontWeight: "700", color: DS.ink },
});
