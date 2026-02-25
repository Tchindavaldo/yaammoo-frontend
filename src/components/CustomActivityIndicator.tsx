import React from "react";
import { View, StyleSheet } from "react-native";
import { Loader } from "./Loader";
import { Theme } from "../theme";

interface CustomActivityIndicatorProps {
  animating?: boolean;
  size?: "small" | "large" | number;
  color?: string;
  hidesWhenStopped?: boolean;
}

export const ActivityIndicator: React.FC<CustomActivityIndicatorProps> = ({
  animating = true,
  size = "large",
  color = Theme.colors.primary,
  hidesWhenStopped = true,
}) => {
  if (!animating && hidesWhenStopped) {
    return null;
  }

  // Use Loader for the animation
  return (
    <View style={styles.container}>
      <Loader
        size={size === "large" ? 50 : size === "small" ? 30 : size}
        color={color}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12, // Add space below the indicator
  },
});
