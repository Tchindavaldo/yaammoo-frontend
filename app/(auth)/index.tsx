import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { authService } from "@/src/features/auth/services/authService";
import { handleGoogleSignIn } from "@/src/features/auth/services/googleAuthService";

/**
 * RECTIFICATION ALIGNEMENT ET ESPACEMENT - FIDÉLITÉ 1:1 IONIC
 */
export default function AuthScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { setUserData } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [connect, setConnect] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordIsShow, setPasswordIsShow] = useState(false);

  // Media Query simulations (Basé sur auth.page2.scss)
  const isSmall = height < 700;
  const isExtraSmall = height < 500;

  const connectWithGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await handleGoogleSignIn();
      if (result.success && result.userData) {
        setUserData(result.userData);
        router.replace("/(tabs)");
      } else {
        if (result.error && result.error !== "Connexion annulée") {
          Alert.alert("Erreur Google", result.error);
        }
      }
    } catch {
      Alert.alert("Erreur", "Connexion Google échouée.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const connectUser = async () => {
    if (email !== "" && password !== "") {
      setConnect(true);
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const data = await authService.getUserById(userCredential.user.uid);
        if (data) setUserData(data);
        router.replace("/(tabs)");
      } catch {
        setConnect(false);
        Alert.alert("Erreur", "Connexion échouée.");
      }
    } else {
      Alert.alert("Erreur", "l'email ou le mot de passe ne doit pas etre vide");
    }
  };

  const direct = (rout: string) => {
    router.push(`/(auth)/${rout}` as any);
  };

  const isAnyLoading = connect || googleLoading;

  return (
    <View style={styles.content}>
      <ImageBackground
        source={require("@/assets/blur3.jpg")}
        style={styles.cardBack}
        resizeMode="cover"
      >
        <View style={styles.cardBlack}>
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View
          style={[
            styles.cardGrid,
            isSmall && { marginTop: isExtraSmall ? -30 : -60 },
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                bounces={false}
              >
                <View style={styles.ionGrid}>
                  {/* Row 1: Welcome */}
                  {!isExtraSmall && (
                    <View style={styles.row1}>
                      <Text style={styles.welcomeLabel}>
                        <Text style={styles.welcomeSpan}>Welcome to</Text>
                        {"\n"}
                        Rudavo{"\n"}
                        FastFood
                      </Text>
                    </View>
                  )}

                  {/* Row 2: Connexion */}
                  <View style={styles.row2}>
                    <View style={styles.colSize5}>
                      <Text style={styles.labelConnexion}>Connexion</Text>
                    </View>
                    <View style={styles.colTopIconG}>
                      <TouchableOpacity
                        onPress={connectWithGoogle}
                        disabled={isAnyLoading}
                      >
                        {googleLoading ? (
                          <ActivityIndicator size="small" color="#a65757" />
                        ) : (
                          <Ionicons
                            name="logo-google"
                            size={24}
                            color="#a65757"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.colTopIconW}>
                      <TouchableOpacity
                        onPress={() => direct("phone")}
                        disabled={isAnyLoading}
                      >
                        <Ionicons
                          name="logo-whatsapp"
                          size={24}
                          color="#a65757"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Row 3: Email */}
                  <View style={styles.row3}>
                    <Ionicons
                      name="person"
                      size={20}
                      color="#a65757"
                      style={styles.ico1}
                    />
                    <TextInput
                      style={styles.ionInput}
                      placeholder="Entrer votre mot de Email"
                      placeholderTextColor="#a3a3a3"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isAnyLoading}
                    />
                  </View>

                  {/* Row 4: Password */}
                  <View style={styles.row4}>
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color="#a65757"
                      style={styles.ico1}
                    />
                    <TextInput
                      style={styles.ionInput}
                      placeholder="Entrer votre mot de passe"
                      placeholderTextColor="#a3a3a3"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!passwordIsShow}
                      editable={!isAnyLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setPasswordIsShow(!passwordIsShow)}
                      style={styles.ico2}
                    >
                      <Ionicons
                        name={passwordIsShow ? "eye-off" : "eye"}
                        size={20}
                        color="#a65757"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Row 6: Action Button */}
                  <View style={styles.rowAction}>
                    <View style={styles.colBtnConnect}>
                      <TouchableOpacity
                        style={styles.ionButton}
                        onPress={connectUser}
                        disabled={isAnyLoading}
                      >
                        {connect ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons
                            name="arrow-forward-outline"
                            size={20}
                            color="white"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                    {!isSmall && (
                      <TouchableOpacity style={styles.colForgot}>
                        <Text style={styles.labelForgot}>Forget Password?</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Row 7: Inscription Section */}
                  {!isSmall && (
                    <View style={styles.rowNoAccount}>
                      <View style={styles.colSize5}>
                        <Text style={styles.labelInscripLabel}>
                          vous n&apos;avez pas de compte ?
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Augmentation de l'espace */}
                  <View style={[styles.rowInscription, { marginTop: 15 }]}>
                    {isExtraSmall && (
                      <Text style={styles.labelInscripLabel}>
                        vous n&apos;avez pas de compte ?
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.ionChip}
                      onPress={() => direct("register")}
                      disabled={isAnyLoading}
                    >
                      <Text style={styles.chipText}>inscription</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row 9: Connect Label */}
                  {!isSmall && (
                    <>
                      <View style={styles.rowConnectLabel}>
                        <Text style={styles.labelConnectAvec}>
                          Connectez Vous Avec
                        </Text>
                      </View>

                      <View style={styles.rowOtherConnect}>
                        <View style={styles.colSize1}>
                          <TouchableOpacity
                            onPress={connectWithGoogle}
                            disabled={isAnyLoading}
                          >
                            {googleLoading ? (
                              <ActivityIndicator size="small" color="#a65757" />
                            ) : (
                              <Ionicons
                                name="logo-google"
                                size={35}
                                color="#a65757"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                        <View style={styles.colSize5Bottom}>
                          <TouchableOpacity
                            onPress={() => direct("phone")}
                            disabled={isAnyLoading}
                          >
                            <Ionicons
                              name="logo-whatsapp"
                              size={35}
                              color="#a65757"
                              style={{ left: 10 }}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Responsive small substitut */}
                  {isSmall && !isExtraSmall && (
                    <View style={styles.colOtherConnectSmall}>
                      <TouchableOpacity
                        onPress={connectWithGoogle}
                        disabled={isAnyLoading}
                      >
                        {googleLoading ? (
                          <ActivityIndicator size="small" color="#a65757" />
                        ) : (
                          <Ionicons
                            name="logo-google"
                            size={35}
                            color="#a65757"
                          />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => direct("phone")}
                        disabled={isAnyLoading}
                      >
                        <Ionicons
                          name="logo-whatsapp"
                          size={35}
                          color="#a65757"
                          style={{ marginLeft: 30 }}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  cardBack: { flex: 1, height: "100%", width: "100%" },
  cardBlack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.57)",
    zIndex: 10,
  },
  cardGrid: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    backgroundColor: "transparent",
  },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  ionGrid: { paddingHorizontal: 15, width: "100%" },
  // Row 1: Welcome
  row1: { top: 25, marginBottom: 20 },
  welcomeLabel: {
    fontSize: 50,
    color: "white",
    fontWeight: "bold",
    lineHeight: 55,
  },
  welcomeSpan: { fontSize: 24, fontWeight: "300" },
  // Row 2: Connexion
  row2: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 10,
  },
  colSize5: { width: (Dimensions.get("window").width - 30) * (5 / 12) },
  colTopIconG: {
    width: (Dimensions.get("window").width - 30) * (5 / 12),
    alignItems: "flex-end",
    paddingRight: 9,
  },
  colTopIconW: {
    width: (Dimensions.get("window").width - 30) * (2 / 12),
    alignItems: "center",
  },
  labelConnexion: { fontSize: 20, fontWeight: "bold", color: "white" },
  // Inputs
  row3: {
    position: "relative",
    justifyContent: "center",
    height: 60,
    marginTop: 5,
  },
  row4: {
    position: "relative",
    justifyContent: "center",
    height: 60,
    marginTop: 9,
  },
  ico1: { position: "absolute", left: 0, zIndex: 101 },
  ico2: { position: "absolute", right: 0, zIndex: 101, padding: 5 },
  ionInput: {
    height: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ffffff59",
    paddingLeft: 30,
    color: "white",
    fontSize: 16,
  },
  // Action Row
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  colBtnConnect: { width: "auto" },
  ionButton: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: "darkred",
    justifyContent: "center",
    alignItems: "center",
  },
  colForgot: { flex: 1, alignItems: "flex-end" },
  labelForgot: { color: "white", fontSize: 14 },
  // Inscription Section
  rowNoAccount: {
    marginTop: 9,
    width: (Dimensions.get("window").width - 30) * (5 / 12),
  },
  labelInscripLabel: { fontSize: 13, color: "white" },
  rowInscription: { flexDirection: "row", alignItems: "center" },
  ionChip: {
    backgroundColor: "darkred",
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
    shadowColor: "rgb(255, 157, 157)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 8,
  },
  chipText: { fontSize: 9, color: "white", fontWeight: "bold" },
  // Bottom Part
  rowConnectLabel: { marginTop: 25 },
  labelConnectAvec: { color: "white", fontSize: 13 },
  rowOtherConnect: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  colSize1: {
    width: (Dimensions.get("window").width - 30) * (1 / 12),
    alignItems: "center",
  },
  colSize5Bottom: {
    width: (Dimensions.get("window").width - 30) * (5 / 12),
    alignItems: "flex-start",
  },
  colOtherConnectSmall: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 15,
    marginTop: 10,
  },
});
