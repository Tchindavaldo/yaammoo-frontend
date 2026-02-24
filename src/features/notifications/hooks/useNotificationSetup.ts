import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useAuth } from "../../auth/context/AuthContext";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotificationSetup = () => {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Action au clic sur la notification : redirection vers Tab 4
        router.push("/notifications");
      },
    );

    return () => subscription.remove();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
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
    if (token && token !== (userData as any).fcmToken) {
      await syncToken(token);
    }
  };

  const syncToken = async (token: string) => {
    if (!userData) return;
    try {
      await axios.put(`${Config.apiUrl}/user/update/${userData?.uid}`, {
        fcmToken: token,
      });
      console.log("FCM Token synced with backend");
    } catch (error) {
      console.error("Error syncing FCM token:", error);
      await storage.set("unsentFcmToken", token);
    }
  };

  return { setup };
};
