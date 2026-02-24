import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Text } from "react-native";
import { Svg, Path, G } from "react-native-svg";
import { Theme } from "@/src/theme";

interface AppLoaderProps {
  message?: string;
  visible: boolean;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ message, visible }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [visible, rotateAnim]);

  if (!visible) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width="80" height="80" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
          <G>
            <Path
              d="M9 50A41 41 0 0 0 91 50A41 43 0 0 1 9 50"
              fill={Theme.colors.primary}
            />
          </G>
        </Svg>
      </Animated.View>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: Theme.colors.dark,
    fontWeight: "600",
  },
});
