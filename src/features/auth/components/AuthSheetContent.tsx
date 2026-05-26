import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { handleGoogleSignIn } from "@/src/features/auth/services/googleAuthService";
import { handleAppleSignIn } from "@/src/features/auth/services/appleAuthService";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { authService } from "@/src/features/auth/services/authService";

const AppleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      fill="#141414"
      d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.32-.05-.01-.06-.04-.21-.04-.36 0-1.13.541-2.33 1.16-3.05.79-.93 2.05-1.6 3.1-1.62.04.16.06.32.06.43zM20.5 17.34c-.55 1.21-.81 1.74-1.51 2.81-1 1.49-2.4 3.34-4.13 3.36-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09.99C5.04 23.49 3.7 21.74 2.7 20.25 0 16.41-.36 11.91 1.4 9.5c1.27-1.71 3.27-2.71 5.15-2.71 1.92 0 3.13 1.05 4.71 1.05 1.54 0 2.48-1.05 4.7-1.05 1.68 0 3.45.91 4.71 2.49-4.13 2.26-3.46 8.16.83 8.06z"
    />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <Path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <Path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <Path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2C41.3 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </Svg>
);

export default function AuthSheetContent() {
  const router = useRouter();
  const { setUserData } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const onGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await handleGoogleSignIn();
      if (result.success && result.userData) {
        setUserData(result.userData);
        router.replace("/(tabs)");
      } else if (result.error && result.error !== "Connexion annulée") {
        Alert.alert("Erreur Google", result.error);
      }
    } catch {
      Alert.alert("Erreur", "Connexion Google échouée.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const onApple = async () => {
    if (appleLoading) return;
    setAppleLoading(true);
    try {
      const result = await handleAppleSignIn();
      if (result.success && result.userData) {
        setUserData(result.userData);
        router.replace("/(tabs)");
      } else if (result.error && result.error !== "Connexion annulée") {
        Alert.alert("Erreur Apple", result.error);
      }
    } catch {
      Alert.alert("Erreur", "Connexion Apple échouée.");
    } finally {
      setAppleLoading(false);
    }
  };

  const onLogin = async () => {
    if (loggingIn) return;
    if (!email || !password) {
      Alert.alert("Erreur", "L'email ou le mot de passe ne doit pas être vide.");
      return;
    }
    setLoggingIn(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const data = await authService.getUserById(cred.user.uid);
      if (data) setUserData(data);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Connexion échouée.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <View style={styles.content}>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        Welcome to Yaammoo <Text style={styles.wave}>👋</Text>
      </Text>
      <Text style={styles.subtitle}>
        The best cooking and food recipes app of the century.
      </Text>

      <View style={styles.auth}>
        {!emailMode ? (
          <>
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.btn}
                onPress={onApple}
                disabled={appleLoading}
                activeOpacity={0.85}
              >
                {appleLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#141414"
                    style={styles.btnIcon}
                  />
                ) : (
                  <View style={styles.btnIcon}>
                    <AppleIcon />
                  </View>
                )}
                <Text style={styles.btnText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btn}
              onPress={onGoogle}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#141414"
                  style={styles.btnIcon}
                />
              ) : (
                <View style={styles.btnIcon}>
                  <GoogleIcon />
                </View>
              )}
              <Text style={styles.btnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign in with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => setEmailMode(true)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color="#ffffff"
                style={styles.btnIcon}
              />
              <Text style={[styles.btnText, styles.btnTextPrimary]}>
                Sign In with email
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#7a7a78"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#a8a8a6"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loggingIn}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#7a7a78"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#a8a8a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loggingIn}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.inputRight}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#7a7a78"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={onLogin}
              disabled={loggingIn}
              activeOpacity={0.85}
            >
              {loggingIn ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.btnText, styles.btnTextPrimary]}>
                  Login
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => setEmailMode(false)}
              activeOpacity={0.85}
            >
              <View style={styles.socialIconsRow}>
                <AppleIcon />
                <View style={{ width: 18 }} />
                <GoogleIcon />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footerLine}>
        <Text style={styles.footerText}>Don&apos;t have account?</Text>
        <Text style={styles.footerLink}> Sign Up</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#141414",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  wave: { fontSize: 26 },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#7a7a78",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 280,
  },
  auth: { width: "100%", gap: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ececec",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  btnIcon: { position: "absolute", left: 22 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#141414" },
  btnPrimary: { backgroundColor: "#141414", borderColor: "#141414" },
  btnTextPrimary: { color: "#ffffff" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ececec" },
  dividerText: { fontSize: 12, color: "#a8a8a6", fontWeight: "500" },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  footerText: { fontSize: 14, color: "#7a7a78", fontWeight: "500" },
  footerLink: { fontSize: 14, color: "#141414", fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ececec",
    borderRadius: 999,
    paddingHorizontal: 20,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#141414",
    fontWeight: "500",
    paddingVertical: 0,
  },
  inputRight: { paddingLeft: 10 },
  socialIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
