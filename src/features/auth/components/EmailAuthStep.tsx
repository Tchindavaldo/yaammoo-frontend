import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppleIcon, GoogleIcon, WhatsAppIcon } from "./AuthProviderIcons";
import { AuthFieldCapsule } from "./AuthFieldCapsule";

/**
 * Connexion / inscription par email — DESIGN D'ORIGINE conserve.
 *
 * ⚠️ WORKFLOW repris de l'etape paiement du panier groupe
 * (`CartGroupedDeliverySheet` + `CartGroupedDetailCapsule`) : les deux champs
 * de la sheet ne sont PAS des `TextInput`, ce sont des LEURRES. Le tap ouvre
 * `AuthFieldCapsule`, capsule flottante posee sur un voile floute et ancree au
 * clavier, qui porte le seul vrai champ. Un champ a la fois.
 *
 * ⚠️ Le clavier custom (`TextKeyboard`) reste dans le projet mais n'est PAS
 * utilise ici : aucune bascule entre les deux.
 */

interface EmailAuthStepProps {
  /** `true` = creation de compte, `false` = connexion. */
  isRegister: boolean;
  onSubmit: (email: string, password: string) => Promise<void> | void;
  /** Bascule connexion <-> inscription (lien de bas de sheet). */
  onToggleMode: () => void;
  /** Retour aux boutons sociaux (ligne d'icones Apple/Google). */
  onBack: () => void;
}

/** Champ ouvert dans la capsule. `null` = capsule fermee. */
type Field = "email" | "password" | null;

export const EmailAuthStep: React.FC<EmailAuthStepProps> = ({
  isRegister,
  onSubmit,
  onToggleMode,
  onBack,
}) => {
  const [field, setField] = React.useState<Field>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Plus de suivi du clavier ici : la capsule est a position fixe et se ferme
  // sur la perte de focus de son champ, pas sur la descente du clavier.
  const closeCapsule = React.useCallback(() => setField(null), []);

  const submit = React.useCallback(
    async (mail: string, pwd: string) => {
      if (loading) return;
      // Erreur INLINE, jamais d'`Alert` natif : la boite volerait le focus.
      if (!mail || !pwd) {
        setError("L'email ou le mot de passe ne doit pas être vide.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await onSubmit(mail, pwd);
        // Succes : loader maintenu jusqu'au demontage par le guard, comme
        // Google/Apple (cf. architecture/auth.md).
      } catch (err: any) {
        setError(
          err?.message ??
            (isRegister ? "Inscription échouée." : "Connexion échouée."),
        );
        setLoading(false);
      }
    },
    [loading, onSubmit, isRegister],
  );

  /**
   * Saisie recue de la capsule, ROUTEE vers le bon champ.
   *
   * ⚠️ Un seul champ est monte a la fois, mais l'AutoFill du trousseau
   * remplit le couple identifiant + mot de passe d'un coup. Depuis le champ
   * email, une valeur arrivant d'un bloc et ne ressemblant pas a une adresse
   * est donc le MOT DE PASSE : on la range ou il faut plutot que de l'ecrire
   * dans l'email.
   */
  const handleCapsuleChange = React.useCallback(
    (v: string) => {
      setError(null);
      if (field === "password") {
        setPassword(v);
        return;
      }
      // Saisie au clavier : un caractere a la fois, jamais un bloc.
      const pasted = v.length - email.length > 1;
      if (pasted && !v.includes("@") && v.length >= 4) {
        setPassword(v);
        return;
      }
      setEmail(v);
    },
    [field, email],
  );

  /**
   * Validation DEPUIS la capsule. Sur l'email, elle enchaine sur le mot de
   * passe sans repasser par la sheet ; sur le mot de passe, elle soumet.
   */
  const handleCapsuleSubmit = React.useCallback(() => {
    if (field === "email") {
      setField("password");
      return;
    }
    Keyboard.dismiss();
    void submit(email, password);
  }, [field, email, password, submit]);

  /** Un leurre : meme gabarit que l'input d'origine, mais non editable. */
  const renderLure = (target: Exclude<Field, null>) => {
    const isPwd = target === "password";
    const value = isPwd ? password : email;

    return (
      <TouchableOpacity
        style={styles.inputWrap}
        onPress={() => {
          setError(null);
          setField(target);
        }}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isPwd ? "lock-closed-outline" : "mail-outline"}
          size={18}
          color="#7a7a78"
          style={styles.inputIcon}
        />
        <Text
          style={[styles.input, !value && styles.inputPlaceholder]}
          numberOfLines={1}
        >
          {value
            ? isPwd
              ? "•".repeat(value.length)
              : value
            : isPwd
              ? "Mot de passe"
              : "Adresse email"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.content}>
        {/* Titre et description propres a CETTE etape : le message d'accueil
            appartient a l'ecran des boutons sociaux, pas ici. */}
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {isRegister ? "Inscription via email" : "Connexion via email"}
        </Text>
        <Text style={styles.subtitle}>
          {isRegister
            ? "Créez votre compte avec votre adresse email et un mot de passe."
            : "Entrez votre adresse email et votre mot de passe pour continuer."}
        </Text>

        <View style={styles.auth}>
          {renderLure("email")}
          {renderLure("password")}

          {/* Hauteur reservee : l'apparition de l'erreur ne decale rien. */}
          <View style={styles.errorSlot}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => submit(email, password)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.btnText, styles.btnTextPrimary]}>
                {isRegister ? "Créer le compte" : "Se connecter"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Ou continuer avec</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={onBack}
            disabled={loading}
            activeOpacity={0.85}
          >
            <View style={styles.socialIconsRow}>
              <AppleIcon />
              <View style={{ width: 18 }} />
              <GoogleIcon />
              <View style={{ width: 18 }} />
              <WhatsAppIcon />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerLine}>
          <Text style={styles.footerText}>
            {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}
          </Text>
          <TouchableOpacity
            onPress={onToggleMode}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>
              {isRegister ? " Se connecter" : " S'inscrire"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Capsule rendue APRES le contenu : elle se pose par-dessus la sheet et
          monte avec le clavier sans etre rognee. */}
      <AuthFieldCapsule
        visible={field !== null}
        field={field ?? "email"}
        value={field === "password" ? password : email}
        onChange={handleCapsuleChange}
        onSubmit={handleCapsuleSubmit}
        onClose={closeCapsule}
      />
    </>
  );
};

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
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#7a7a78",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 280,
  },
  auth: { width: "100%", gap: 10 },
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
  },
  inputPlaceholder: { color: "#a8a8a6" },
  errorSlot: { height: 18, justifyContent: "center" },
  error: {
    fontSize: 13,
    color: "#d92d20",
    fontWeight: "500",
    textAlign: "center",
  },
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
  socialIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  footerText: { fontSize: 14, color: "#7a7a78", fontWeight: "500" },
  footerLink: { fontSize: 14, color: "#141414", fontWeight: "700" },
});
