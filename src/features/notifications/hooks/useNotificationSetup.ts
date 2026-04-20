import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useAuth } from "../../auth/context/AuthContext";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { Users } from "@/src/types";
import { useNotificationContext } from "../context/NotificationContext";
import { getNotificationRoute } from "../utils/notificationRouting";
import { auth } from "@/src/services/firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const routeFromData = (data: any): string => {
  if (!data) return "/(tabs)/notifications";
  return getNotificationRoute({ type: data.type, route: data.route } as any);
};

export const useNotificationSetup = () => {
  const { userData, setUserData } = useAuth();
  const router = useRouter();
  const { refresh } = useNotificationContext();

  // Tap sur la notif (app background / foreground)
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      const route = routeFromData(data);
      router.push(route as any);
    });

    // Notif reçue app ouverte : rafraîchir la liste (filet de sécurité en plus du socket)
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      refresh(true).catch(() => {});
    });

    // App killed → tap sur notif → routing initial
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          const data = last.notification.request.content.data as any;
          const route = routeFromData(data);
          router.push(route as any);
        }
      } catch {}
    })();

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [router, refresh]);

  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice && Platform.OS !== "android") {
      console.log("Must use physical device for Push Notifications");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? (require("@/app.json").expo?.extra?.eas?.projectId ?? undefined);
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("Expo Push Token:", token);

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("high_priority_channel", {
        name: "high_priority_channel",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
      });
    }

    return token;
  };

  const syncToken = async (token: string) => {
    if (!userData) return;
    const idToken = await auth.currentUser?.getIdToken();
    await axios.put(`${Config.apiUrl}/user/${userData?.uid}`, { fcmToken: token }, {
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    // Mise à jour locale pour éviter les re-sync inutiles
    const existing = ((userData as any).fcmTokens as string[] | undefined) || [];
    const nextTokens = existing.includes(token) ? existing : [...existing, token];
    const updated: Users = { ...(userData as any), fcmTokens: nextTokens };
    setUserData(updated);
    await storage.set("user_data", updated);
  };

  const setup = async () => {
    if (!userData) return;

    // Tenter de renvoyer un token précédemment échoué
    const unsentToken = await storage.get("unsentFcmToken");
    if (unsentToken) {
      try {
        await syncToken(unsentToken);
        await storage.remove("unsentFcmToken");
      } catch (e) {
        console.warn("Retry sync token failed");
      }
    }

    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    const existing = ((userData as any).fcmTokens as string[] | undefined) || [];
    if (existing.includes(token)) return; // déjà synchronisé

    try {
      await syncToken(token);
    } catch (error) {
      console.error("Error syncing FCM token:", error);
      await storage.set("unsentFcmToken", token);
    }
  };

  return { setup };
};
