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
  style,
  intensity,
  tint,
  blurReductionFactor,
  ...props
}) => {
  // Sans flou natif ET avec un fond de repli fourni, on rend une View simple :
  // en mode "none", expo-blur écrase la couleur de fond de la vue native avec
  // son propre voile, ce qui rendrait `fallbackStyle` sans effet.
  if (!isNativeBlurAvailable && fallbackStyle) {
    return <View {...props} style={[style, fallbackStyle]} />;
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
