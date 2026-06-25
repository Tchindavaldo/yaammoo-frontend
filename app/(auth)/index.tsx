import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  Pressable,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AuthSheetContent from "@/src/features/auth/components/AuthSheetContent";
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  RadialGradient as SvgRadialGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { useRouter } from "expo-router";
import { useHideSplash } from "@/src/hooks/useHideSplash";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import {
  useFonts,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function Sparkle({ size, style }: { size: number; style?: object }) {
  return (
    <View style={[{ position: "absolute", width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z"
          fill="#1a1a1a"
        />
      </Svg>
    </View>
  );
}

function Doodle({
  children,
  style,
}: {
  children: React.ReactNode;
  style: object;
}) {
  return (
    <View style={[{ position: "absolute" }, style]} pointerEvents="none">
      {children}
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const hideSplash = useHideSplash();
  const { user, userData, loading } = useAuth();

  // On ne cache le splash depuis cet écran QUE si l'auth est résolue et l'user
  // est réellement non connecté (vrai écran de login au boot). Si l'user est
  // connecté (transition login → home, ou boot à froid déjà loggé), on laisse
  // le splash en place : c'est la home qui le cachera une fois prête. Évite de
  // flasher l'écran de login pendant la transition.
  const isSignedIn = !!user && !!userData;
  const onLayoutRootView = !loading && !isSignedIn ? hideSplash : undefined;
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: sheetOpen ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 140,
      mass: 0.9,
    }).start();
  }, [sheetOpen, slide]);

  // Décalage clavier : on remonte le sheet entier de la hauteur du clavier
  // (le sheet est en absolu + transform, un KeyboardAvoidingView est inopérant).
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration ?? 250 : 150,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration ?? 250 : 150,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  if (!fontsLoaded) return null;

  const onGetStarted = () => setSheetOpen(true);
  const closeSheet = () => setSheetOpen(false);

  const openTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, 0],
  });
  const sheetTranslateY = Animated.subtract(openTranslateY, keyboardOffset);
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.stage} onLayout={onLayoutRootView}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.phone}>
        {/* Base gradient */}
        <LinearGradient
          colors={["#f7f5f4", "#f3eeec", "#f6e6dd"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Warm radial glows via SVG */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={SCREEN_W}
          height={SCREEN_H}
        >
          <Defs>
            <SvgRadialGradient
              id="g1"
              cx={SCREEN_W * 0.6}
              cy={SCREEN_H * 0.58}
              rx={SCREEN_W * 0.7}
              ry={SCREEN_W * 0.7}
              fx={SCREEN_W * 0.6}
              fy={SCREEN_H * 0.58}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#f5be82" stopOpacity={0.85} />
              <Stop offset="35%" stopColor="#f0c8a5" stopOpacity={0.55} />
              <Stop offset="70%" stopColor="#f0c8a5" stopOpacity={0} />
            </SvgRadialGradient>
            <SvgRadialGradient
              id="g2"
              cx={SCREEN_W * 0.3}
              cy={SCREEN_H * 0.7}
              rx={SCREEN_W * 0.8}
              ry={SCREEN_W * 0.8}
              fx={SCREEN_W * 0.3}
              fy={SCREEN_H * 0.7}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#ebb4a5" stopOpacity={0.55} />
              <Stop offset="65%" stopColor="#ebb4a5" stopOpacity={0} />
            </SvgRadialGradient>
            <SvgRadialGradient
              id="g3"
              cx={SCREEN_W * 0.85}
              cy={SCREEN_H * 0.8}
              rx={SCREEN_W * 0.75}
              ry={SCREEN_W * 0.75}
              fx={SCREEN_W * 0.85}
              fy={SCREEN_H * 0.8}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#fac88c" stopOpacity={0.7} />
              <Stop offset="65%" stopColor="#fac88c" stopOpacity={0} />
            </SvgRadialGradient>
          </Defs>
          <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="url(#g1)" />
          <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="url(#g2)" />
          <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="url(#g3)" />
        </Svg>

        {/* Sparkles top-right */}
        <View style={styles.sparkles} pointerEvents="none">
          <Sparkle size={18} style={{ top: 0, right: 0 }} />
          <Sparkle size={12} style={{ top: 28, right: 38 }} />
          <Sparkle size={7} style={{ top: 50, right: 8, opacity: 0.7 }} />
        </View>

        {/* Content: headline + button */}
        <View style={styles.content}>
          <Text style={styles.headline}>
            Quick{"\n"}Bites, Fast{"\n"}Delivery!
          </Text>

          <TouchableOpacity
            style={styles.btnGetStarted}
            activeOpacity={0.85}
            onPress={onGetStarted}
          >
            <Text style={styles.btnText}>Get started</Text>
            <Svg width={14} height={14} viewBox="0 0 14 14">
              <Path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="#fff"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Doodles */}
        <Doodle style={styles.burger}>
          <Svg viewBox="0 0 44 44" width="100%" height="100%">
            <G
              fill="none"
              stroke="#c9a394"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M6 22c0-7 7-12 16-12s16 5 16 12" />
              <Path d="M6 28h32" />
              <Path d="M8 32c2 2 5 2 7 0s5-2 7 0 5 2 7 0 5-2 7 0" />
              <Circle cx={14} cy={18} r={1} />
              <Circle cx={22} cy={15} r={1} />
              <Circle cx={30} cy={18} r={1} />
            </G>
          </Svg>
        </Doodle>

        <Doodle style={styles.donut}>
          <Svg viewBox="0 0 42 42" width="100%" height="100%">
            <G
              fill="none"
              stroke="#c9a394"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Circle cx={21} cy={21} r={14} />
              <Circle cx={21} cy={21} r={5} />
              <Path d="M9 16c1 1 2 1 3 0M14 11c1 1 2 1 3 0M28 10c1 1 2 1 3 0M33 16c1 1 2 1 3 0" />
            </G>
          </Svg>
        </Doodle>

        <Doodle style={styles.coffee}>
          <Svg viewBox="0 0 40 46" width="100%" height="100%">
            <G
              fill="none"
              stroke="#c9a394"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M10 16h22l-2 24a4 4 0 01-4 4H16a4 4 0 01-4-4L10 16z" />
              <Path d="M8 16h26" />
              <Path d="M16 8c0 2-2 2-2 4M22 6c0 2-2 2-2 4M28 8c0 2-2 2-2 4" />
            </G>
          </Svg>
        </Doodle>

        <Doodle style={styles.croissant}>
          <Svg viewBox="0 0 38 30" width="100%" height="100%">
            <G
              fill="none"
              stroke="#c9a394"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M4 22c4-12 16-18 30-16-2 14-12 22-26 22l-4-6z" />
              <Path d="M12 18l4-6M18 20l4-6M24 20l4-6" />
            </G>
          </Svg>
        </Doodle>

        {/* Rider */}
        <Image
          source={require("@/assets/images/delivery-rider.png")}
          style={styles.rider}
          resizeMode="contain"
        />

        {/* Bottom sheet backdrop */}
        {sheetOpen && (
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: backdropOpacity, zIndex: 9 }]}
            pointerEvents="auto"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet}>
              <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.backdropDim} />
            </Pressable>
          </Animated.View>
        )}

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
          pointerEvents={sheetOpen ? "auto" : "none"}
        >
          <View style={styles.sheetHandle} />
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthSheetContent />
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#ececec",
    justifyContent: "center",
    alignItems: "center",
  },
  phone: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  sparkles: {
    position: "absolute",
    top: 70,
    right: 40,
    width: 90,
    height: 60,
    zIndex: 4,
  },
  content: {
    position: "absolute",
    top: 96,
    left: 36,
    right: 36,
    zIndex: 4,
    alignItems: "flex-start",
  },
  headline: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -0.6,
    color: "#141414",
    marginBottom: 32,
  },
  btnGetStarted: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141414",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: "#ffffff",
    letterSpacing: 0.2,
    marginRight: 8,
  },
  burger: {
    top: "50%",
    right: "28%",
    width: 38,
    height: 38,
    opacity: 0.5,
    zIndex: 2,
  },
  donut: {
    top: "56%",
    right: "6%",
    width: 38,
    height: 38,
    opacity: 0.55,
    zIndex: 2,
  },
  coffee: {
    top: "60%",
    left: "8%",
    width: 34,
    height: 40,
    opacity: 0.5,
    zIndex: 2,
  },
  croissant: {
    top: "50%",
    left: "30%",
    width: 34,
    height: 28,
    opacity: 0.45,
    zIndex: 2,
  },
  rider: {
    position: "absolute",
    bottom: 0,
    right: 10,
    width: SCREEN_W * 0.85,
    height: SCREEN_W * 0.95,
    zIndex: 3,
  },

  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,20,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_H * 0.82,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 24,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#e0e0de",
    marginTop: 8,
    marginBottom: 4,
  },
});
