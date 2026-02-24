import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Svg, Path, G } from "react-native-svg";
import { Theme } from "../theme";

interface LoaderProps {
  size?: number;
  color?: string;
  style?: any;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 80,
  color = Theme.colors.primary,
  style,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid"
        >
          <G>
            <Path
              d="M9 50A41 41 0 0 0 91 50A41 43 0 0 1 9 50"
              fill={color}
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});