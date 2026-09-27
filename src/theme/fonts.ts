/**
 * Police de l'app, changeable par OTA : modifier `FONT_THEME` puis publier.
 *
 * Toutes les polices sont embarquees dans le bundle JS (assets), donc une mise
 * a jour OTA suffit pour basculer ; seule la police active est chargee.
 *
 * - "jakarta" : Plus Jakarta Sans, geometrique moderne, chaleureuse (defaut).
 * - "manrope" : Manrope, tres nette, un peu technique, chiffres elegants.
 * - "figtree" : Figtree, douce et lisible, minimaliste.
 * - "dmsans"  : DM Sans, compacte et sobre, rendu « produit » premium.
 * - "system"  : police du systeme (San Francisco / Roboto), l'ancien rendu.
 *
 * Les cles de chargement sont les noms PostScript des fichiers : le meme nom
 * sert au `fontFamily` React et a `UIFont(name:)` dans les modules natifs iOS.
 */
export type FontThemeName = "jakarta" | "manrope" | "figtree" | "dmsans" | "system";

export const FONT_THEME = "jakarta" as FontThemeName;

/** Graisses servies ; les autres sont ramenees a la plus proche. */
export type FontWeightKey = 400 | 500 | 600 | 700 | 800 | 900;
type FontSet = Record<FontWeightKey, { name: string; file: number }>;

const JAKARTA: FontSet = {
  400: { name: "PlusJakartaSans-Regular", file: require("@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf") },
  500: { name: "PlusJakartaSans-Medium", file: require("@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf") },
  600: { name: "PlusJakartaSans-SemiBold", file: require("@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf") },
  700: { name: "PlusJakartaSans-Bold", file: require("@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf") },
  800: { name: "PlusJakartaSans-ExtraBold", file: require("@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf") },
  // Pas de 900 chez Jakarta : l'ExtraBold le remplace.
  900: { name: "PlusJakartaSans-ExtraBold", file: require("@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf") },
};

const MANROPE: FontSet = {
  400: { name: "Manrope-Regular", file: require("@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf") },
  500: { name: "Manrope-Medium", file: require("@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf") },
  600: { name: "Manrope-SemiBold", file: require("@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf") },
  700: { name: "Manrope-Bold", file: require("@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf") },
  800: { name: "Manrope-ExtraBold", file: require("@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf") },
  // Pas de 900 chez Manrope : l'ExtraBold le remplace.
  900: { name: "Manrope-ExtraBold", file: require("@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf") },
};

const FIGTREE: FontSet = {
  400: { name: "Figtree-Regular", file: require("@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf") },
  500: { name: "Figtree-Medium", file: require("@expo-google-fonts/figtree/500Medium/Figtree_500Medium.ttf") },
  600: { name: "Figtree-SemiBold", file: require("@expo-google-fonts/figtree/600SemiBold/Figtree_600SemiBold.ttf") },
  700: { name: "Figtree-Bold", file: require("@expo-google-fonts/figtree/700Bold/Figtree_700Bold.ttf") },
  800: { name: "Figtree-ExtraBold", file: require("@expo-google-fonts/figtree/800ExtraBold/Figtree_800ExtraBold.ttf") },
  900: { name: "Figtree-Black", file: require("@expo-google-fonts/figtree/900Black/Figtree_900Black.ttf") },
};

const DMSANS: FontSet = {
  400: { name: "DMSans-Regular", file: require("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf") },
  500: { name: "DMSans-Medium", file: require("@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf") },
  600: { name: "DMSans-SemiBold", file: require("@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf") },
  700: { name: "DMSans-Bold", file: require("@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf") },
  800: { name: "DMSans-ExtraBold", file: require("@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf") },
  900: { name: "DMSans-Black", file: require("@expo-google-fonts/dm-sans/900Black/DMSans_900Black.ttf") },
};

const SETS: Record<Exclude<FontThemeName, "system">, FontSet> = {
  jakarta: JAKARTA,
  manrope: MANROPE,
  figtree: FIGTREE,
  dmsans: DMSANS,
};

/** Jeu actif, `null` = police systeme (aucun remplacement). */
export const ACTIVE_FONTS: FontSet | null = FONT_THEME === "system" ? null : SETS[FONT_THEME];

/** Carte `nom → fichier` a passer a `Font.loadAsync` / `useFonts`. */
export const activeFontFiles = (): Record<string, number> => {
  const out: Record<string, number> = {};
  if (ACTIVE_FONTS) for (const f of Object.values(ACTIVE_FONTS)) out[f.name] = f.file;
  return out;
};

/** `fontWeight` RN (« bold », « 600 »…) → graisse servie la plus proche. */
export const weightKey = (w: unknown): FontWeightKey => {
  const n = w === "bold" ? 700 : w === "normal" || w == null ? 400 : Number(w) || 400;
  if (n <= 450) return 400;
  if (n <= 550) return 500;
  if (n <= 650) return 600;
  if (n <= 750) return 700;
  if (n <= 850) return 800;
  return 900;
};

/** Nom de police pour une graisse, `null` en police systeme. */
export const fontFor = (w: unknown): string | null => ACTIVE_FONTS?.[weightKey(w)].name ?? null;
