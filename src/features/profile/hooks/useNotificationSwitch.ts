import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useNotificationSetup } from "@/src/features/notifications/hooks/useNotificationSetup";
import { getDeviceId } from "@/src/features/notifications/services/deviceId";
import * as Notifications from "expo-notifications";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";

/**
 * Switch « Notifications » de Settings.
 *
 * Reflète l'état RÉEL : permission OS native (lue au montage), pas un simple
 * booléen local. Le OFF (révocation) ne peut pas être fait par code
 * (iOS/Android l'interdisent) : au tap OFF le switch reste visuel, non
 * fonctionnel. Le ON relance le même flux qu'au premier lancement de l'app
 * (permission + sync du token en BD).
 */
export function useNotificationSwitch() {
  const { userData } = useAuth();
  const navigation = useNavigation();
  const { setup: setupNotifications } = useNotificationSetup();
  const [notifEnabled, setNotifEnabled] = useState(false);

  // État réel du switch Notifications : ON seulement si la permission OS est
  // accordée ET qu'un token de CE device est déjà synced en BD
  // (userData.pushTokens). Un refus au premier lancement (permission refusée
  // → jamais de token envoyé) affiche donc bien OFF, et le tap relance la
  // demande native. Re-lu à chaque focus de l'écran (retour depuis les
  // réglages système après un changement de permission).
  useEffect(() => {
    let cancelled = false;
    const readState = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setNotifEnabled(false);
        return;
      }
      const deviceId = await getDeviceId();
      const pushTokens =
        ((userData as any)?.pushTokens as { deviceId: string }[] | undefined) ||
        [];
      const hasTokenSynced = pushTokens.some((t) => t?.deviceId === deviceId);
      if (!cancelled) setNotifEnabled(hasTokenSynced);
    };
    readState();
    const unsub = navigation.addListener("focus", readState);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [navigation, userData]);

  const handleNotifToggle = async (next: boolean) => {
    if (!next) {
      // Pas de révocation possible par code : état visuel seulement.
      setNotifEnabled(false);
      return;
    }
    // ON = même flux que le premier lancement (permission native + sync BD).
    await setupNotifications();
    const { status } = await Notifications.getPermissionsAsync();
    setNotifEnabled(status === "granted");
  };

  return { notifEnabled, handleNotifToggle };
}
