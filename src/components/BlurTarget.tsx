import React, { ReactNode } from "react";
import { View, ViewProps } from "react-native";

/**
 * Anciennes cibles du flou Android (SDK 57, `BlurTargetView`).
 *
 * ⚠️ Android ne floute plus rien (voir `AppBlurView`) : ces deux composants
 * sont desormais INERTES sur tous les OS. `BlurTarget` est un simple `View`
 * (memes props, meme mise en page), `BlurScope` ne fait que rendre ses
 * enfants. Ils restent en place pour ne pas toucher a la structure des ecrans
 * qui les utilisent ; plus aucune vue native de cible n'est creee, ce qui
 * retire aussi le cout de rendu qu'elle ajoutait sous les listes.
 */

/** Zone qui partageait une cible et ses flous. Rend ses enfants tels quels. */
export function BlurScope({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Ex-contenu a flouter : un `View` ordinaire. `active` est ignore. */
export function BlurTarget({
  active: _active,
  children,
  ...props
}: ViewProps & { active?: boolean }) {
  return <View {...props}>{children}</View>;
}
