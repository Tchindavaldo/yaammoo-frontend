import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import Svg, { Circle, Rect, Path, Line } from "react-native-svg";

/**
 * Vélo animé — rotation des roues sur thread natif via Animated.View,
 * combiné au SVG original pour le châssis/corps.
 *
 * Les roues tournent avec Animated.View + transform rotate + useNativeDriver: true.
 * Bobbing et route également sur thread natif.
 */
export const BikeAnimation: React.FC<{
  paused?: boolean;
  hideLabel?: boolean;
}> = ({ paused = false, hideLabel = false }) => {
  // Valeur d'angle en degrés : 0 → 360
  const spinVal = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) {
      spinVal.setValue(0);
      bobAnim.setValue(0);
      roadAnim.setValue(0);
      return;
    }

    // Rotation infinie 0° → 360°
    Animated.loop(
      Animated.sequence([
        Animated.timing(spinVal, {
          toValue: 360,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(spinVal, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Bobbing
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -2,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Route qui défile (loop avec reset)
    Animated.loop(
      Animated.sequence([
        Animated.timing(roadAnim, {
          toValue: -20,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(roadAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [paused, spinVal, bobAnim, roadAnim]);

  const wheelSpin = spinVal.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  // Roue sous forme de View pivotante contenant le SVG original
  const renderWheel = (x: number, y: number) => (
    <Animated.View
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 7,
        width: 14,
        height: 14,
        transform: [{ rotate: wheelSpin }],
      }}
    >
      <Svg width="14" height="14" viewBox="-2 -2 18 18" fill="none">
        <Circle
          r="7"
          cx="7"
          cy="7"
          stroke="#3B6D11"
          strokeWidth="2"
          fill="none"
        />
        <Line
          x1="7"
          y1="0"
          x2="7"
          y2="14"
          stroke="#3B6D11"
          strokeWidth="1.2"
          strokeLinecap="butt"
        />
        <Line
          x1="0"
          y1="7"
          x2="14"
          y2="7"
          stroke="#3B6D11"
          strokeWidth="1.2"
          strokeLinecap="butt"
        />
        <Line
          x1="2"
          y1="2"
          x2="12"
          y2="12"
          stroke="#3B6D11"
          strokeWidth="1.2"
          strokeLinecap="butt"
        />
        <Line
          x1="12"
          y1="2"
          x2="2"
          y2="12"
          stroke="#3B6D11"
          strokeWidth="1.2"
          strokeLinecap="butt"
        />
      </Svg>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.scene}>
        {/* ROAD */}
        <Animated.View
          style={[styles.roadStrip, { transform: [{ translateX: roadAnim }] }]}
        >
          {[...Array(15)].map((_, i) => (
            <View key={i} style={styles.roadDash} />
          ))}
        </Animated.View>

        {/* BIKE */}
        <Animated.View
          style={[styles.bikeWrap, { transform: [{ translateY: bobAnim }] }]}
        >
          <View style={{ width: 62, height: 28 }}>
            {/* Roue arrière (derrière le châssis) */}
            {renderWheel(9, 22)}

            {/* SVG statique : châssis complet */}
            <Svg width="62" height="28" viewBox="0 0 62 30" fill="none">
              {/* BODY */}
              <Rect
                x="1"
                y="12"
                width="20"
                height="11"
                rx="2"
                fill="#EAF3DE"
                stroke="#3B6D11"
                strokeWidth="1.5"
              />
              <Line
                x1="1"
                y1="18"
                x2="21"
                y2="18"
                stroke="#3B6D11"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <Path
                d="M21 15 L33 15 L33 7 L41 7 L51 15"
                stroke="#3B6D11"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d="M27 15 L33 7"
                stroke="#3B6D11"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <Path
                d="M51 15 L53 22"
                stroke="#3B6D11"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <Path
                d="M33 7 L33 3"
                stroke="#3B6D11"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <Line
                x1="30"
                y1="3"
                x2="36"
                y2="3"
                stroke="#3B6D11"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <Line
                x1="33"
                y1="7"
                x2="28"
                y2="7"
                stroke="#3B6D11"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <Circle cx="33" cy="15" r="2" fill="#3B6D11" />
            </Svg>

            {/* Roue avant (par-dessus le châssis) */}
            {renderWheel(51, 22)}
          </View>
        </Animated.View>
      </View>
      {/*{!hideLabel && <Text style={styles.label}>En route...</Text>}*/}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 68,
    alignItems: "center",
    gap: 2,
  },
  scene: {
    width: 66,
    height: 36,
    position: "relative",
    overflow: "hidden",
    borderRadius: 4,
  },
  bikeWrap: {
    position: "absolute",
    bottom: 4,
    left: 2,
  },
  roadStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 300,
    height: 5,
    flexDirection: "row",
  },
  roadDash: {
    width: 10,
    height: 5,
    backgroundColor: "#3B6D11",
    opacity: 0.25,
    marginRight: 10,
  },
  label: {
    fontSize: 8.5,
    fontWeight: "500",
    color: "#27500A",
    textAlign: "center",
    marginTop: 2,
  },
});
