import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NumericKeypad } from "./NumericKeypad";
import {
  isInvalidCode,
  isRateLimited,
} from "../services/whatsappAuthService";

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
/**
 * Part de l'espace libre placee AU-DESSUS du header, sur Android.
 * Le reste va entre la saisie et le clavier. 0 = mise en page d'origine,
 * 1 = saisie collee au clavier. Les boutons du bas ne bougent jamais : le
 * clavier reste plaque en bas dans tous les cas.
 */
const TOP_SPACE_RATIO = Platform.OS === "android" ? 1 : 0;
/**
 * ESPACE SAISIE ↔ CLAVIER. Ce sont les deux seules valeurs a baisser : le
 * spacer etant deja a zero sur Android, le vide restant vient de la hauteur
 * reservee au bloc de saisie et a la ligne d'erreur.
 * Minimum utile : 52 (hauteur d'une case de code) et 0.
 */
const DISPLAY_H = Platform.OS === "android" ? 56 : 64;
const ERROR_SLOT_H = Platform.OS === "android" ? 4 : 18;

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
  /**
   * Secondes restantes avant de pouvoir redemander un code (429). Le backend
   * les donne dans `Retry-After` ; le bouton « renvoyer » reste desactive
   * jusqu'a 0.
   */
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

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
      // ⚠️ Numero NU, sans indicatif : c'est ce qu'attend
      // `POST /auth/phone/request` (ex. « 698087460 »). Le `+237` affiche a
      // gauche du champ n'est qu'un repere visuel.
      await onSubmitPhone(phone);
      // Le champ du code repart vide : un code precedent encore present serait
      // envoye par erreur au premier appui sur « Verifier ».
      setCode("");
      setStep("code");
    } catch (err: any) {
      if (isRateLimited(err)) {
        // Trop de demandes : on arme le compte a rebours et on passe quand
        // meme a l'etape du code — un code precedent peut encore etre valide.
        setCooldown(err.retryAfter);
        setError(
          `Trop de tentatives. Réessayez dans ${err.retryAfter} secondes.`,
        );
        setStep("code");
        return;
      }
      setError(err?.message ?? "Envoi du code impossible.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renvoi du code. Passe par `onSubmitPhone` — c'est le MEME endpoint que le
   * premier envoi — et arme le compte a rebours si le backend refuse (429).
   */
  const handleResend = async () => {
    if (loading || cooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await (onResend ? onResend() : onSubmitPhone(phone));
      setCode("");
    } catch (err: any) {
      if (isRateLimited(err)) {
        setCooldown(err.retryAfter);
        setError(
          `Trop de tentatives. Réessayez dans ${err.retryAfter} secondes.`,
        );
        return;
      }
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
      if (isInvalidCode(err)) {
        // Le backend precise le motif et ce qu'il reste de tentatives : on les
        // affiche plutot qu'un « code invalide » sec.
        const left =
          err.attemptsRemaining !== undefined
            ? ` ${err.attemptsRemaining} tentative${
                err.attemptsRemaining > 1 ? "s" : ""
              } restante${err.attemptsRemaining > 1 ? "s" : ""}.`
            : "";
        setError(`${err.reason ?? "Code invalide."}${left}`);
        // Le code refuse est efface : l'utilisateur ressaisit sans avoir a
        // vider les cases une a une.
        setCode("");
        setLoading(false);
        return;
      }
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
      <View style={styles.gapSpace} />

      <NumericKeypad
        onPress={handleKey}
        onDelete={handleDelete}
        onBack={handleBack}
        disabled={loading}
      />

      {/* Le retour a rejoint le clavier (case a gauche du 0) : l'action occupe
          desormais toute la largeur. */}
      <View style={styles.actionRow}>
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

        {/* Etape code : « Renvoyer » a droite de « Verifier », en contour pour
            rester secondaire. */}
        {!isPhone ? (
          <TouchableOpacity
            style={[styles.resendBtn, cooldown > 0 && styles.resendBtnOff]}
            onPress={handleResend}
            // Verrouille pendant le compte a rebours impose par le backend
            // (429 + `Retry-After`).
            disabled={loading || cooldown > 0}
            activeOpacity={0.7}
          >
            <Text style={styles.resendBtnText}>
              {cooldown > 0 ? `${cooldown} s` : "Renvoyer"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Espace libre rejete SOUS les boutons (Android) : le clavier se colle a
          la zone de saisie au lieu d'etre plaque en bas de la sheet. */}
      {TOP_SPACE_RATIO > 0 ? <View style={styles.bottomSpace} /> : null}
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
    height: DISPLAY_H,
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
  errorSlot: { height: ERROR_SLOT_H, justifyContent: "center" },
  error: {
    fontSize: 13,
    color: "#d92d20",
    fontWeight: "500",
    textAlign: "center",
  },
  // Les deux se partagent l'espace libre : ce qui va au-dessus du header n'est
  // plus entre la saisie et le clavier. Total constant, donc le clavier et les
  // boutons restent exactement a la meme place aux deux etapes.
  bottomSpace: { flex: TOP_SPACE_RATIO },
  gapSpace: { flex: 1 - TOP_SPACE_RATIO },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
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
  /** Compte a rebours en cours : le bouton se lit comme indisponible. */
  resendBtnOff: { opacity: 0.4 },
  resendBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
  },
  resendBtnText: { fontSize: 15, fontWeight: "600", color: "#141414" },
});
