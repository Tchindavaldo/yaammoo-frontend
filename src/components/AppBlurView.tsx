import { BlurView, BlurViewProps } from "expo-blur";
import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";

/**
 * Android 12 (API 31) : seuil à partir duquel `expo-blur` floute via `RenderEffect`.
 * En dessous il retombe sur `RenderScriptBlur`, qui redessine tout l'arbre de vues
 * dans un canvas logiciel et crashe au scroll
 * (`IndexOutOfBoundsException` dans `ViewGroup.getAndVerifyPreorderedView`,
 * la liste d'enfants pré-ordonnée étant partagée entre les passes de dessin).
 */
const ANDROID_RENDER_EFFECT_API = 31;

/** `true` quand la plateforme sait vraiment flouter (iOS, ou Android 12+). */
export const isNativeBlurAvailable =
  Platform.OS !== "android" ||
  Number(Platform.Version) >= ANDROID_RENDER_EFFECT_API;

interface AppBlurViewProps extends BlurViewProps {
  /**
   * Style appliqué UNIQUEMENT quand le flou natif n'est pas disponible
   * (Android < 12). Sert à opacifier le fond : sans flou, un panneau
   * semi-transparent laisse lire le contenu situé derrière.
   */
  fallbackStyle?: StyleProp<ViewStyle>;
  /**
   * `true` = jamais de flou natif sur Android, TOUTES versions confondues : on
   * rend une `View` opacifiee par `fallbackStyle`.
   *
   * A poser sur les blurs places DEVANT une liste qui defile. Le chemin
   * `dimezisBlurView` (bibliotheque `eightbitlab`) redessine l'arbre de vues a
   * chaque frame et leve une `IndexOutOfBoundsException` dans
   * `ViewGroup.getAndVerifyPreorderedView` des qu'un enfant est retire pendant
   * le scroll — constate sur Android 16, independamment de la version.
   *
   * iOS n'est pas concerne (UIVisualEffectView, aucun probleme).
   */
  disableAndroidBlur?: boolean;
}

/**
 * BlurView unifié iOS / Android.
 *
 * iOS : flou natif via UIVisualEffectView, rien à configurer.
 *
 * Android : `expo-blur` ne floute que si `experimentalBlurMethod="dimezisBlurView"`
 * est passé. On l'active automatiquement à partir d'Android 12 (chemin RenderEffect,
 * accéléré et stable) et on le laisse désactivé en dessous, où l'implémentation
 * RenderScript fait crasher l'app dès qu'une liste scrolle derrière le flou.
 * Sous Android 12, le rendu retombe sur un voile teinté, à opacifier via
 * `fallbackStyle` quand le contenu derrière doit rester illisible.
 */
export const AppBlurView: React.FC<AppBlurViewProps> = ({
  experimentalBlurMethod,
  fallbackStyle,
  disableAndroidBlur,
  style,
  intensity,
  tint,
  blurReductionFactor,
  ...props
}) => {
  // Flou coupe sur Android quel que soit l'OS (blur devant une liste scrollable).
  // Pas de `pointerEvents="none"` par defaut ici : ces blurs ENVELOPPENT du
  // contenu (badges, barre de stock), le sous-arbre doit rester interactif.
  if (disableAndroidBlur && Platform.OS === "android") {
    return <View {...props} style={[style, fallbackStyle]} />;
  }

  // Sans flou natif, on ne monte JAMAIS le composant natif d'expo-blur : même en
  // mode "none" il instancie une vue RenderScript, qui crashe au scroll sous
  // Android 12. On rend une View simple, opacifiée par `fallbackStyle` quand il
  // est fourni (en mode "none" expo-blur écraserait cette couleur avec son voile).
  if (!isNativeBlurAvailable) {
    // `pointerEvents="none"` : un BlurView est un voile decoratif et ne capte
    // aucun geste. Une `View` de repli, elle, intercepte le drag — la liste
    // rendue dessous devenait alors impossible a faire defiler sur Android < 12.
    // L'appelant peut le forcer via `props` s'il a besoin de capter les touches.
    return (
      <View pointerEvents="none" {...props} style={[style, fallbackStyle]} />
    );
  }

  return (
    <BlurView
      {...props}
      style={style}
      intensity={intensity}
      tint={tint}
      blurReductionFactor={blurReductionFactor}
      experimentalBlurMethod={
        experimentalBlurMethod ??
        (Platform.OS === "android"
          ? isNativeBlurAvailable
            ? "dimezisBlurView"
            : "none"
          : undefined)
      }
    />
  );
};

export default AppBlurView;
