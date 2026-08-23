import React from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextKeyboard } from "./TextKeyboard";

/**
 * Connexion / inscription par email — refonte sur le modele du flux WhatsApp.
 *
 * ⚠️ AUCUN `TextInput`, aucun clavier natif : la saisie passe par
 * `TextKeyboard`, rendu dans la sheet. Meme motif que `WhatsAppAuthStep` — la
 * hauteur du clavier systeme varie selon l'appareil et ferait sauter la sheet,
 * dont la hauteur est desormais fixe.
 *
 * ⚠️ Les DEUX champs sont montes en permanence. Celui qui n'est pas actif est
 * reduit et estompe, jamais demonte : la bascule est donc une animation sur du
 * contenu deja peint (cf. `CartGroupedDetailCapsule`, meme principe), et non un
 * remplacement qui ferait clignoter la zone.
 */

interface EmailAuthStepProps {
  /** `true` = creation de compte, `false` = connexion. */
  isRegister: boolean;
  onSubmit: (email: string, password: string) => Promise<void> | void;
  /** Bascule connexion <-> inscription. */
  onToggleMode: () => void;
  onBack: () => void;
}

/** Champ actuellement alimente par le clavier. */
type Field = "email" | "password";

const PASSWORD_MIN = 6;

export const EmailAuthStep: React.FC<EmailAuthStepProps> = ({
  isRegister,
  onSubmit,
  onToggleMode,
  onBack,
}) => {
  const [field, setField] = React.useState<Field>("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEmail = field === "email";
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const valid = emailValid && password.length >= PASSWORD_MIN;

  // Progression 0 → 1 : 0 = email actif, 1 = mot de passe actif. Une seule
  // valeur pilote les deux champs, ils ne peuvent donc pas se desynchroniser.
  const slide = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(slide, {
      toValue: isEmail ? 0 : 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      // `height` n'est pas prise en charge par le driver natif : les champs se
      // redimensionnent, on reste donc sur le thread JS.
      useNativeDriver: false,
    }).start();
  }, [isEmail, slide]);

  const handleKey = (char: string) => {
    if (loading) return;
    setError(null);
    (isEmail ? setEmail : setPassword)((v) => v + char);
  };

  const handleDelete = () => {
    if (loading) return;
    setError(null);
    (isEmail ? setEmail : setPassword)((v) => v.slice(0, -1));
  };

  const submit = async () => {
    // Le premier appui passe simplement au mot de passe : l'utilisateur n'a pas
    // a viser le second champ pour continuer.
    if (isEmail) {
      if (!emailValid) {
        setError("Adresse email invalide.");
        return;
      }
      setField("password");
      return;
    }
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(email, password);
      // Succes : loader maintenu jusqu'au demontage par le guard, comme
      // Google/Apple (cf. architecture/auth.md).
    } catch (err: any) {
      setError(err?.message ?? "Connexion échouée.");
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (!isEmail) {
      setField("email");
      setError(null);
      return;
    }
    onBack();
  };

  /** Un champ : hauteur et opacite animees selon qu'il est actif ou non. */
  const renderField = (target: Field) => {
    const active = field === target;
    const isPwd = target === "password";
    const value = isPwd ? password : email;
    // Le champ actif garde sa taille pleine, l'autre se retracte.
    const progress = isPwd ? slide : slide.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    return (
      <Animated.View
        style={[
          styles.field,
          {
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [44, 56],
            }),
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.45, 1],
            }),
            borderColor: active ? "#141414" : "#ececec",
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fieldTouch}
          onPress={() => setField(target)}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPwd ? "lock-closed-outline" : "mail-outline"}
            size={17}
            color="#7a7a78"
          />
          <Text
            style={[styles.fieldValue, !value && styles.fieldPlaceholder]}
            numberOfLines={1}
          >
            {value
              ? isPwd && !showPassword
                ? "•".repeat(value.length)
                : value
              : isPwd
                ? "Mot de passe"
                : "Adresse email"}
          </Text>
          {isPwd && value ? (
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={17}
                color="#7a7a78"
              />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.content}>
      <Text style={styles.headerText}>
        {isRegister
          ? "Créez votre compte avec une adresse email."
          : "Connectez-vous avec votre adresse email."}
      </Text>

      <View style={styles.fields}>
        {renderField("email")}
        {renderField("password")}
      </View>

      <View style={styles.errorSlot}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.spacer} />

      <TextKeyboard
        onPress={handleKey}
        onDelete={handleDelete}
        disabled={loading}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#141414" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            (isEmail ? !emailValid : !valid) && styles.btnDisabled,
          ]}
          onPress={submit}
          disabled={loading || (isEmail ? !emailValid : !valid)}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.btnText}>
              {isEmail ? "Continuer" : isRegister ? "Créer le compte" : "Se connecter"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.toggle}
        onPress={onToggleMode}
        disabled={loading}
        hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          {isRegister ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <Text style={styles.toggleLink}>
            {isRegister ? "Se connecter" : "S'inscrire"}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: "center",
  },
  headerText: {
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    color: "#7a7a78",
    fontWeight: "500",
  },
  fields: { width: "100%", gap: 8, marginTop: 14 },
  field: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },
  fieldTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#141414",
  },
  fieldPlaceholder: { fontWeight: "500", color: "#a8a8a6" },
  errorSlot: { height: 18, justifyContent: "center", marginTop: 4 },
  error: {
    fontSize: 13,
    color: "#d92d20",
    fontWeight: "500",
    textAlign: "center",
  },
  spacer: { flex: 1 },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    height: 48,
    backgroundColor: "#141414",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  toggle: { height: 28, justifyContent: "center" },
  toggleText: { fontSize: 13, color: "#7a7a78", fontWeight: "500" },
  toggleLink: { color: "#141414", fontWeight: "700" },
});
