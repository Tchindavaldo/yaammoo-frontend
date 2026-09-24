import { BlurView, BlurViewProps } from "expo-blur";
import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";

/**
 * `true` quand la plateforme floute vraiment : iOS uniquement.
 *
 * ⚠️ SDK 57 (`expo-blur` 57) : sur Android, un `BlurView` ne floute plus que ce
 * qui est enveloppe dans un `<BlurTargetView>` passe via `blurTarget`. Sans
 * cible, il retombe en voile semi-transparent ET logue un avertissement a
 * chaque montage. L'app ne declare aucune cible : tous les Android suivent donc
 * le chemin « sans flou » (View opacifiee par `fallbackStyle`), celui
 * qu'utilisait deja Android < 12 — rendu connu et teste.
 *
 * Retablir un vrai flou Android = poser un `BlurTargetView` autour du contenu
 * a flouter, le `BlurView` etant HORS de cette cible. A tester sur appareil :
 * l'ancien chemin `dimezisBlurView` crashait des qu'une liste defilait derriere.
 */
export const isNativeBlurAvailable = Platform.OS !== "android";

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
 * Android : jamais de composant natif d'expo-blur (voir `isNativeBlurAvailable`).
 * Le rendu est une `View` opacifiée par `fallbackStyle`, à fournir quand le
 * contenu derrière doit rester illisible.
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
  // Flou coupe sur Android quel que soit l'OS (blur devant une liste scrollable).
  // Pas de `pointerEvents="none"` par defaut ici : ces blurs ENVELOPPENT du
  // contenu (badges, barre de stock), le sous-arbre doit rester interactif.
  if (disableAndroidBlur && Platform.OS === "android") {
    return <View {...props} style={[style, fallbackStyle]} />;
  }

  // Sans flou natif (Android), on ne monte JAMAIS le composant natif
  // d'expo-blur : on rend une View simple, opacifiée par `fallbackStyle` quand
  // il est fourni (en mode "none" expo-blur écraserait cette couleur avec son
  // voile).
  if (!isNativeBlurAvailable) {
    // `pointerEvents="none"` : un BlurView est un voile decoratif et ne capte
    // aucun geste. Une `View` de repli, elle, intercepte le drag — la liste
    // rendue dessous devenait alors impossible a faire defiler.
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
    />
  );
};

export default AppBlurView;
