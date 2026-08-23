import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NumericKeypad } from "./NumericKeypad";

/**
 * Authentification WhatsApp — etapes « numero » puis « code ».
 *
 * ⚠️ Composant DEDIE, et non des etapes ajoutees a `AuthSheetContent` : ce
 * dernier frolait deja le plafond de 500 lignes (R4). La sheet ne fait que
 * monter ce composant et recuperer le resultat.
 *
 * ⚠️ AUCUN `TextInput` : la saisie passe par `NumericKeypad`, un clavier custom
 * rendu DANS la sheet. Le clavier natif est volontairement exclu — sa hauteur
 * varie selon l'appareil et l'OS, ce qui ferait sauter la sheet a chaque etape.
 * Ici tout est de hauteur connue et constante.
 *
 * ⚠️ DESIGN SEULEMENT. `onSubmitPhone` / `onSubmitCode` sont fournis par le
 * parent et simules tant que le contrat backend n'est pas donne.
 */

interface WhatsAppAuthStepProps {
  onSubmitPhone: (phone: string) => Promise<void> | void;
  onSubmitCode: (code: string) => Promise<void> | void;
  /** Renvoi du code — etape 2 uniquement. */
  onResend?: () => Promise<void> | void;
  /** Retour aux boutons sociaux (etape 1) ou au numero (etape 2). */
  onBack: () => void;
}

/** Indicatif pays par defaut (Cameroun), affiche en prefixe non editable. */
const DIAL_CODE = "+237";
/** Longueur du code recu par WhatsApp. */
const CODE_LENGTH = 6;
/** Longueur minimale acceptee pour un numero. */
const PHONE_MIN = 8;
/** Garde-fou de saisie : au-dela, l'utilisateur s'est trompe de champ. */
const PHONE_MAX = 15;

export const WhatsAppAuthStep: React.FC<WhatsAppAuthStepProps> = ({
  onSubmitPhone,
  onSubmitCode,
  onResend,
  onBack,
}) => {
  const [step, setStep] = React.useState<"phone" | "code">("phone");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isPhone = step === "phone";
  const value = isPhone ? phone : code;
  const maxLength = isPhone ? PHONE_MAX : CODE_LENGTH;
  const valid = isPhone
    ? phone.length >= PHONE_MIN
    : code.length === CODE_LENGTH;

  const handleKey = (digit: string) => {
    if (loading || value.length >= maxLength) return;
    setError(null);
    (isPhone ? setPhone : setCode)(value + digit);
  };

  const handleDelete = () => {
    if (loading) return;
    setError(null);
    (isPhone ? setPhone : setCode)(value.slice(0, -1));
  };

  const submitPhone = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      // L'indicatif est affiche a part mais doit partir AVEC le numero.
      await onSubmitPhone(`${DIAL_CODE}${phone}`);
      // Le champ du code repart vide : un code precedent encore present serait
      // envoye par erreur au premier appui sur « Verifier ».
      setCode("");
      setStep("code");
    } catch (err: any) {
      setError(err?.message ?? "Envoi du code impossible.");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmitCode(code);
      // Succes : on NE coupe PAS le loader. Comme Google/Apple, il tourne
      // jusqu'a ce que le guard demonte la sheet (cf. architecture/auth.md).
    } catch (err: any) {
      setError(err?.message ?? "Code invalide.");
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "code") {
      setStep("phone");
      setError(null);
      return;
    }
    onBack();
  };

  /** Cases du code : une par chiffre attendu, remplies au fur et a mesure. */
  const codeBoxes = Array.from({ length: CODE_LENGTH }, (_, i) => (
    <View
      key={i}
      style={[styles.codeBox, code[i] ? styles.codeBoxFilled : null]}
    >
      <Text style={styles.codeDigit}>{code[i] ?? ""}</Text>
    </View>
  ));

  return (
    <View style={styles.content}>
      {/* En-tete : uniquement le texte d'explication. Ni titre ni logo (deja
          dits par l'ecran precedent), et le retour est descendu a cote du
          bouton d'action. */}
      <Text style={styles.headerText}>
        {isPhone
          ? "Un code vous sera envoyé sur WhatsApp"
          : `Code à ${CODE_LENGTH} chiffres envoyé au ${DIAL_CODE} ${phone}`}
      </Text>

      {/* Zone de saisie — affichage seul, alimente par le clavier custom. */}
      <View style={styles.display}>
        {isPhone ? (
          <View style={styles.phoneRow}>
            {/* Indicatif FIXE, hors de la valeur saisie : le clavier ne peut
                donc pas l'effacer, et il n'est pas renvoye deux fois a l'API
                (`onSubmitPhone` recoit l'indicatif concatene une seule fois). */}
            <Text style={styles.dialCode}>{DIAL_CODE}</Text>
            <Text style={[styles.phoneText, !phone && styles.phonePlaceholder]}>
              {phone || "6 00 00 00 00"}
            </Text>
          </View>
        ) : (
          <View style={styles.codeRow}>{codeBoxes}</View>
        )}
      </View>

      {/* Erreur INLINE, jamais d'`Alert` natif : la boite de dialogue volerait
          le focus a la sheet. Hauteur reservee pour que rien ne bouge quand
          l'erreur apparait. */}
      <View style={styles.errorSlot}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {/* `flex: 1` : pousse le clavier et le bouton en bas de la sheet, quelle
          que soit la hauteur du bloc du dessus. Les deux etapes gardent donc
          exactement la meme mise en page. */}
      <View style={styles.spacer} />

      <NumericKeypad
        onPress={handleKey}
        onDelete={handleDelete}
        disabled={loading}
      />

      {/* Retour et action sur la meme ligne : le retour est carre a gauche,
          l'action prend le reste de la largeur. */}
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
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={isPhone ? submitPhone : submitCode}
          disabled={loading || !valid}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.btnText}>
              {isPhone ? "Recevoir le code" : "Vérifier"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Hauteur reservee aussi a l'etape 1 : sans elle, la sheet perdrait
          cette ligne au changement d'etape et le clavier remonterait. */}
      <View style={styles.resendSlot}>
        {!isPhone ? (
          <TouchableOpacity
            onPress={onResend}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.resendText}>
              Vous n&apos;avez rien reçu ?{" "}
              <Text style={styles.resendLink}>Renvoyer</Text>
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // `flex: 1` : le composant occupe toute la sheet (hauteur fixe), ce qui
  // permet au `spacer` de plaquer le clavier en bas.
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
  // Hauteur fixe : le passage numero → code ne doit rien decaler.
  display: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dialCode: {
    fontSize: 26,
    fontWeight: "700",
    color: "#7a7a78",
  },
  phoneText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#141414",
    letterSpacing: 1.5,
  },
  phonePlaceholder: {
    fontSize: 15,
    fontWeight: "500",
    color: "#a8a8a6",
    letterSpacing: 0,
  },
  codeRow: { flexDirection: "row", gap: 8 },
  codeBox: {
    width: 42,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxFilled: { borderColor: "#141414", backgroundColor: "#ffffff" },
  codeDigit: { fontSize: 20, fontWeight: "700", color: "#141414" },
  errorSlot: { height: 18, justifyContent: "center" },
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
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    // `flex: 1` : occupe la largeur restante a cote du bouton retour.
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    height: 52,
    backgroundColor: "#141414",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  resendSlot: { height: 30, justifyContent: "center" },
  resendText: { fontSize: 13, color: "#7a7a78", fontWeight: "500" },
  resendLink: { color: "#141414", fontWeight: "700" },
});
