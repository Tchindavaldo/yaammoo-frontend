import { BlurView, BlurViewProps } from "expo-blur";
import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { useBlurTarget } from "./BlurTarget";

/**
 * Android 12 (API 31) : seuil du flou natif. En dessous, la bibliotheque
 * (`eightbitlab` BlurView, via RenderScript) crashait au scroll : on garde le
 * repli `fallbackStyle`, comme avant le SDK 57.
 */
const ANDROID_RENDER_EFFECT_API = 31;

/** `true` quand la plateforme sait flouter (iOS, ou Android 12+). */
export const isNativeBlurAvailable =
  Platform.OS !== "android" ||
  Number(Platform.Version) >= ANDROID_RENDER_EFFECT_API;

/**
 * `true` si un `AppBlurView` rendu A CET ENDROIT floute vraiment : iOS, ou
 * Android 12+ avec une cible `BlurTarget` dans la zone. Sert a opacifier un
 * fond pense pour etre translucide quand aucun flou ne sera dessous.
 */
export function useNativeBlurActive(): boolean {
  const target = useBlurTarget();
  if (Platform.OS !== "android") return true;
  return isNativeBlurAvailable && !!target;
}

interface AppBlurViewProps extends BlurViewProps {
  /**
   * Style appliqué UNIQUEMENT quand le flou n'a pas lieu (Android < 12, flou
   * coupé, ou aucune cible `BlurTarget`). Sert à opacifier le fond : sans
   * flou, un panneau semi-transparent laisse lire le contenu situé derrière.
   */
  fallbackStyle?: StyleProp<ViewStyle>;
  /**
   * `true` = jamais de flou natif sur Android, TOUTES versions confondues : on
   * rend une `View` opacifiee par `fallbackStyle`.
   *
   * A poser sur les blurs places DEVANT une liste qui defile : l'ancien chemin
   * `dimezisBlurView` y levait une `IndexOutOfBoundsException` (constate sur
   * Android 16, au scroll du home). iOS n'est pas concerne.
   */
  disableAndroidBlur?: boolean;
}

/**
 * BlurView unifié iOS / Android.
 *
 * iOS : flou natif via UIVisualEffectView, rien à configurer.
 *
 * Android (SDK 57) : `expo-blur` ne floute que le contenu d'un `BlurTarget`
 * (voir `BlurTarget.tsx`). Le flou vise la cible de son `BlurScope` ; sans
 * cible, sous Android 12 ou avec `disableAndroidBlur`, rendu en `View`
 * opacifiée par `fallbackStyle`.
 */
export const AppBlurView: React.FC<AppBlurViewProps> = ({
  experimentalBlurMethod: _experimentalBlurMethod,
  blurMethod: _blurMethod,
  fallbackStyle,
  disableAndroidBlur,
  style,
  intensity,
  tint,
  blurReductionFactor,
  ...props
}) => {
  const target = useBlurTarget();

  if (Platform.OS === "android") {
    // Flou coupe volontairement. Pas de `pointerEvents="none"` par defaut
    // ici : ces blurs ENVELOPPENT du contenu (badges, barre de stock), le
    // sous-arbre doit rester interactif.
    if (disableAndroidBlur) {
      return <View {...props} style={[style, fallbackStyle]} />;
    }

    if (!isNativeBlurAvailable || !target) {
      // `pointerEvents="none"` : un BlurView est un voile decoratif et ne
      // capte aucun geste. Une `View` de repli, elle, intercepte le drag — la
      // liste rendue dessous devenait alors impossible a faire defiler.
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
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={target}
      />
    );
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
