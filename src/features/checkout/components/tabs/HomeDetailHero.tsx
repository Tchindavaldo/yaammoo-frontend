import React, { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { HeroV1 } from "./detail-hero/HeroV1";
import { HeroProps, SECTION_HEIGHT } from "./detail-hero/heroShared";

/** Espace libre sous la section, avant le footer (ancien `gridRow.marginBottom`). */
const FOOTER_SPACE = 80;

/**
 * Section de l'onglet Detail du checkout HOME : image + tailles + recap
 * (`detail-hero/HeroV1`).
 *
 * Le conteneur a une hauteur FIXE (SECTION_HEIGHT) : le footer ne bouge pas.
 */
export const HomeDetailHero: React.FC<Omit<HeroProps, "width">> = (props) => {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={{ height: SECTION_HEIGHT, marginBottom: FOOTER_SPACE }}
      onLayout={onLayout}
    >
      {width > 0 && <HeroV1 {...props} width={width} />}
    </View>
  );
};
