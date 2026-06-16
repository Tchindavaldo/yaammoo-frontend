import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface AnimatedBorderGlowProps {
  /** Active l'animation (sinon rien n'est rendu). */
  active: boolean;
  /** Rayon des coins (doit matcher l'overlay). */
  borderRadius?: number;
  /** Épaisseur du trait lumineux. */
  strokeWidth?: number;
  /** Durée d'un tour complet (ms). */
  duration?: number;
}

/**
 * Bordure lumineuse multicolore : un segment brillant parcourt le contour
 * de l'overlay parent (positionné en absoluteFill). À poser DANS le panneau,
 * au-dessus du fond mais sous le contenu.
 */
export const AnimatedBorderGlow: React.FC<AnimatedBorderGlowProps> = ({
  active,
  borderRadius = 18,
  strokeWidth = 3,
  duration = 1800,
}) => {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, progress]);

  if (!active) return null;

  const { width, height } = size;
  // Périmètre approximatif du rectangle arrondi.
  const perimeter =
    2 * (width + height) - 8 * borderRadius + 2 * Math.PI * borderRadius;
  // Longueur du segment lumineux (~25 % du périmètre).
  const dashLen = perimeter * 0.25;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {width > 0 && height > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ec4913" />
              <Stop offset="0.33" stopColor="#f59e0b" />
              <Stop offset="0.66" stopColor="#10b981" />
              <Stop offset="1" stopColor="#3b82f6" />
            </LinearGradient>
          </Defs>
          <AnimatedRect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={width - strokeWidth}
            height={height - strokeWidth}
            rx={borderRadius}
            ry={borderRadius}
            fill="none"
            stroke="url(#glow)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={[dashLen, perimeter - dashLen]}
            strokeDashoffset={progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -perimeter],
            })}
          />
        </Svg>
      )}
    </View>
  );
};
