import { BlurView, BlurViewProps } from "expo-blur";
import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";

/**
 * `true` quand un flou natif est rendu : iOS uniquement.
 *
 * ⚠️ Android : PLUS AUCUN flou, toutes versions confondues. Le flou natif
 * (`eightbitlab`, via `BlurTargetView`) ne s'appliquait qu'a partir
 * d'Android 12 et seulement la ou une cible existait : selon l'appareil, un
 * meme ecran sortait floute ou en fond blanc. Tout Android prend desormais le
 * rendu des anciennes versions (`fallbackStyle`), le meme partout.
 */
export const isNativeBlurAvailable = Platform.OS !== "android";

/**
 * `true` si un `AppBlurView` rendu a cet endroit floute vraiment (iOS). Sert a
 * opacifier un fond pense pour etre translucide quand aucun flou ne sera dessous.
 */
export function useNativeBlurActive(): boolean {
  return isNativeBlurAvailable;
}

interface AppBlurViewProps extends BlurViewProps {
  /**
   * Style applique UNIQUEMENT quand le flou n'a pas lieu (Android). Sert a
   * opacifier le fond : sans flou, un panneau semi-transparent laisse lire le
   * contenu situe derriere.
   */
  fallbackStyle?: StyleProp<ViewStyle>;
  /**
   * Le flou enveloppe du contenu INTERACTIF (badges, barre de stock) : sur
   * Android, la `View` de repli garde alors ses touches. Sans ce drapeau, elle
   * est `pointerEvents="none"`, comme un vrai BlurView.
   */
  disableAndroidBlur?: boolean;
}

/**
 * BlurView unifie iOS / Android.
 *
 * iOS : flou natif via UIVisualEffectView.
 * Android : `View` simple portant `fallbackStyle` (aucun flou, voir plus haut).
 */
export const AppBlurView: React.FC<AppBlurViewProps> = ({
  experimentalBlurMethod: _experimentalBlurMethod,
  blurMethod: _blurMethod,
  blurTarget: _blurTarget,
  fallbackStyle,
  disableAndroidBlur,
  style,
  intensity,
  tint,
  blurReductionFactor,
  ...props
}) => {
  if (Platform.OS === "android") {
    if (disableAndroidBlur) {
      return <View {...props} style={[style, fallbackStyle]} />;
    }
    // `pointerEvents="none"` : un BlurView est un voile decoratif et ne capte
    // aucun geste. Une `View` de repli, elle, intercepterait le drag — la liste
    // rendue dessous deviendrait impossible a faire defiler.
    return <View pointerEvents="none" {...props} style={[style, fallbackStyle]} />;
  }

  return (
    <BlurView
      {...props}
      style={style}
      intensity={intensity}
      tint={tint}
      blurReductionFactor={blurReductionFactor}
    />
  );
};

export default AppBlurView;
