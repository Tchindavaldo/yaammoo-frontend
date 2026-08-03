import { useRef, useState } from "react";
import { Animated, Platform } from "react-native";

/** Toast global du panneau (succes / erreur), anime depuis le haut. */
export const useToast = () => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    message: "",
    type: "success",
  });
  const toastAnimY = useRef(new Animated.Value(-100)).current;

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
    duration = 3000,
  ) => {
    setToastConfig({ message, type });
    setToastVisible(true);
    Animated.sequence([
      Animated.spring(toastAnimY, {
        toValue: Platform.OS === "ios" ? 60 : 40,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.delay(duration),
      Animated.timing(toastAnimY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  return { toastVisible, toastConfig, toastAnimY, showToast };
};
