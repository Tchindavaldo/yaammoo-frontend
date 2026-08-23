import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

/**
 * ANDROID : pied COMPACT — logos en pastilles et bascule en pilule, sur une
 * seule rangee. Empiles, le separateur, le cadre des logos et le lien
 * debordaient de la sheet. iOS garde sa disposition d'origine.
 */
const COMPACT_FOOTER = Platform.OS === "android";


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

  /**
   * Dernier champ REELLEMENT ouvert. Sert a alimenter la capsule pendant son
   * fondu de sortie, quand `field` est deja retombe a `null` (cf. sa prop
   * `field` plus bas).
   */
  const lastField = React.useRef<"email" | "password">("email");
  if (field !== null) lastField.current = field;


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

  /** Un leurre : meme gabarit que l'input d'origine, mais non editable. */
  const renderField = (target: Exclude<Field, null>) => {
    const isPwd = target === "password";

    return (
      <View style={styles.inputWrap}>
        <Ionicons
          name={isPwd ? "lock-closed-outline" : "mail-outline"}
          size={18}
          color="#7a7a78"
          style={styles.inputIcon}
        />
        <TextInput
          /* ⚠️ Texte MASQUE tant que la capsule est ouverte. Le leurre reste
             monte et remplissable — c'est lui qui recoit l'identifiant de
             l'autoremplissage — mais on ne veut pas le voir se remplir DERRIERE
             le voile : ce changement transparaissait a travers le flou, en meme
             temps que la capsule, et se lisait comme un rafraichissement de
             l'ecran. Le champ reprend sa couleur des la capsule refermee, avec
             la valeur a jour. */
          style={[styles.input, field !== null && styles.inputMuted]}
          placeholder={isPwd ? "Mot de passe" : "Adresse email"}
          placeholderTextColor={field !== null ? "transparent" : "#a8a8a6"}
          value={isPwd ? password : email}
          onChangeText={(v) => {
            setError(null);
            (isPwd ? setPassword : setEmail)(v);
          }}
          secureTextEntry={isPwd}
          /* ⚠️ Type COMMUN aux deux leurres. C'est ce champ que
             l'autoremplissage sert en premier (cible `username`) avant de
             passer au mot de passe : deux types differents faisaient
             reconstruire le clavier entre les deux, d'ou le flash observe
             uniquement quand les DEUX champs se remplissent d'un coup.
             Ces leurres n'ouvrent de toute facon jamais le clavier
             (`showSoftInputOnFocus={false}`). */
          keyboardType="default"
          autoCapitalize="none"
          /* ⚠️ L'IDENTIFIANT est rempli ICI, dans le leurre — c'est verifie :
             iOS remplit la paire A CHEVAL sur les deux vues. Le champ focalise
             (celui de la capsule) recoit le mot de passe, et ce leurre, bien
             que non focalise, recoit l'identifiant. Un champ non focalise
             DANS la capsule, lui, n'a jamais rien recu.

             Le leurre du mot de passe reste neutre : sa donnee est servie a la
             capsule. Chaque donnee n'a ainsi qu'UNE cible — deux cibles pour
             la meme donnee provoquaient le va-et-vient visible. */
          autoComplete={isPwd ? "off" : "username"}
          textContentType={isPwd ? "none" : "username"}
          editable={!loading}
          /* ⚠️ Le clavier natif ne s'ouvre PAS ici : la saisie se fait dans la
             capsule. Le champ prend le focus (donc l'AutoFill le vise), et le
             tap ouvre la capsule. */
          showSoftInputOnFocus={false}
          /* La frappe se voit dans la capsule : un curseur qui clignote ici en
             meme temps donnerait deux points de saisie a l'ecran. */
          caretHidden
          /* ⚠️ La capsule s'ouvre sur un TAP, jamais sur `onFocus`. L'AutoFill
             focalise lui-meme le champ email pour y ecrire : passer par
             `onFocus` faisait alors basculer la capsule du mot de passe vers
             l'email en pleine selection d'identifiant. */
        />

        {/* Surface tactile POSEE SUR le champ : c'est elle qui ouvre la
            capsule. Le `TextInput` dessous reste focalisable par le systeme
            (indispensable a l'AutoFill) mais ne recoit aucun tap. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setError(null);
            setField(target);
          }}
          disabled={loading}
        />
      </View>
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
          {renderField("email")}
          {renderField("password")}

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

          {/* iOS : separateur + cadre des logos, disposition d'ORIGINE. Sur
              Android ces deux blocs sont remplacés par la rangee compacte
              ci-dessous, ou ils debordaient de la sheet. */}
          {!COMPACT_FOOTER ? (
            <>
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
            </>
          ) : null}
        </View>

        {COMPACT_FOOTER ? (
          /* ANDROID : logos en pastilles et bascule en pilule, sur UNE SEULE
             rangee. */
          <View style={styles.compactFooter}>
            <View style={styles.compactSocial}>
              <TouchableOpacity
                style={styles.socialChip}
                onPress={onBack}
                disabled={loading}
                activeOpacity={0.7}
              >
                <AppleIcon />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialChip}
                onPress={onBack}
                disabled={loading}
                activeOpacity={0.7}
              >
                <GoogleIcon />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialChip}
                onPress={onBack}
                disabled={loading}
                activeOpacity={0.7}
              >
                <WhatsAppIcon />
              </TouchableOpacity>
            </View>

            {/* Pilule, a la hauteur des pastilles : le lien souligne faisait
                tache a cote d'elles. */}
            <TouchableOpacity
              style={styles.compactToggle}
              onPress={onToggleMode}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.compactToggleLink} numberOfLines={1}>
                {isRegister ? "Se connecter" : "S'inscrire"}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#141414" />
            </TouchableOpacity>
          </View>
        ) : (
          /* iOS : ligne de bascule d'ORIGINE, sous le cadre des logos. */
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
        )}
      </View>

      {/* Capsule rendue APRES le contenu : elle se pose par-dessus la sheet et
          monte avec le clavier sans etre rognee. */}
      <AuthFieldCapsule
        visible={field !== null}
        /* ⚠️ On garde le DERNIER champ affiche pendant la fermeture. `field`
           repasse a `null` des que la capsule se ferme, mais elle reste montee
           le temps de son fondu de sortie : retomber sur « email » lui faisait
           changer de champ sous les yeux (placeholder, icone et valeur), ce
           qu'on voyait comme un FLASH en fin d'autoremplissage. */
        field={field ?? lastField.current}
        email={email}
        password={password}
        onChangeEmail={setEmail}
        onChangePassword={setPassword}
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
  /**
   * Leurre pendant que la capsule est ouverte : texte invisible.
   *
   * ⚠️ On MASQUE, on ne demonte pas. Le champ doit rester monte pour recevoir
   * l'identifiant de l'autoremplissage — c'est lui la cible `username`, pas
   * celui de la capsule.
   */
  inputMuted: { color: "transparent" },
  /**
   * Hauteur reservee a l'erreur, RESSERREE : avec les `gap` de part et d'autre,
   * elle creusait un vide entre le mot de passe et le bouton. Les marges
   * negatives absorbent ces deux `gap` — l'erreur reste lisible, mais ne pousse
   * plus le bouton quand il n'y en a pas.
   */
  errorSlot: {
    height: 16,
    justifyContent: "center",
    marginTop: -6,
    marginBottom: -6,
  },
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
  // --- Pied iOS (disposition d'origine) ---
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
  // --- Pied Android (rangee compacte) ---
  /**
   * Une rangee LIBRE, sans cadre ni filet — pastilles
   * de logos a gauche, lien de bascule a droite. Remplace a elle seule le
   * separateur, le cadre des logos et la ligne de bascule, qui empiles
   * debordaient de la sheet.
   */
  compactFooter: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    // Ecart FIXE entre les deux groupes : `space-between` les plaquait aux
    // bords et laissait un grand vide au milieu.
    gap: 10,
    marginTop: 16,
  },
  compactSocial: { flexDirection: "row", alignItems: "center", gap: 10 },
  /** Pastille ronde : le logo se detache sur un fond gris tres clair. */
  socialChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f6f5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * Bascule en PILULE, calee sur la hauteur des pastilles : meme famille de
   * formes, le bas de l'ecran se lit comme une seule rangee coherente.
   */
  compactToggle: {
    // `flex: 1` : la pilule OCCUPE la largeur restante au lieu de laisser un
    // trou entre elle et les pastilles.
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: "#f6f5f4",
  },
  compactToggleLink: { fontSize: 13.5, color: "#141414", fontWeight: "700" },
  footerText: { fontSize: 14, color: "#7a7a78", fontWeight: "500" },
  footerLink: { fontSize: 14, color: "#141414", fontWeight: "700" },
});
