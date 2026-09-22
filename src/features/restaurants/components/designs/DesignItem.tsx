import { CardSkeleton } from "@/src/components/CardSkeleton";
import { Image } from "expo-image";
import React from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { REVEAL_MS, useShopReveal } from "../../context/ShopRevealContext";
import { DesignItemCard } from "./item/DesignItemCard";
import { DesignItemProps, FORCE_SKELETON, SKELETON_SIZES } from "./item/config";
import { ItemMeta } from "./item/parts/ItemMeta";

/**
 * UNE carte menu, avec son squelette et sa revelation.
 *
 * Les 7 variantes de rendu vivent dans `item/` (config, styles, parts,
 * variants) : ce fichier ne porte que l'enveloppe de chargement.
 *
 * Tant que l'image n'est pas resolue : seul le squelette est visible, l'image
 * chargeant cachee derriere lui (le telechargement part donc au premier rendu,
 * pas apres un aller-retour de prefetch).
 *
 * Une fois le groupe pret, la carte et le squelette se croisent sur
 * `revealAnim` : le squelette descend de 1 a 0 pendant que la carte monte de
 * 0 a 1, sur la meme valeur native. Toutes les cartes de la rangee et l'avatar
 * du header lisent CETTE valeur, donc leurs opacites sont egales a chaque frame.
 */
export const DesignItem: React.FC<DesignItemProps> = (props) => {
  const { menu, variant, isLast = false } = props;

  // Une image locale (pas de `menu.image`) est immediate : aucun squelette.
  const [imgLoaded, setImgLoaded] = React.useState(!menu.image);

  // ⚠️ La revelation appartient a la BOUTIQUE, pas a la carte. Inscription
  // pendant le rendu, pas dans un effet : les effets s'executent apres le rendu
  // initial, donc apres la fermeture de la fenetre d'inscription du provider.
  const shop = useShopReveal();
  if (shop && menu.image) shop.register(menu.image);

  const markResolved = React.useCallback(() => {
    setImgLoaded(true);
    if (menu.image) shop?.resolve(menu.image);
  }, [menu.image, shop]);

  const ready = FORCE_SKELETON ? false : shop ? shop.ready : imgLoaded;

  // Hors `ShopRevealProvider` : meme mecanique, groupe d'un seul membre.
  const soloAnim = React.useRef(new Animated.Value(0)).current;
  const reveal = shop ? shop.revealAnim : soloAnim;
  React.useEffect(() => {
    if (shop || !ready) return;
    Animated.timing(soloAnim, {
      toValue: 1,
      duration: REVEAL_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [shop, ready, soloAnim]);

  // Le squelette anime une boucle de respiration sans fin : une fois le fondu
  // termine il est invisible sous une carte opaque, on coupe son animation.
  const [skeletonGone, setSkeletonGone] = React.useState(false);
  React.useEffect(() => {
    if (!ready) {
      setSkeletonGone(false);
      return;
    }
    const timer = setTimeout(() => setSkeletonGone(true), REVEAL_MS + 60);
    return () => clearTimeout(timer);
  }, [ready]);

  // Dimensions de la carte courante, pour que le squelette occupe exactement sa
  // place dans la liste horizontale (sinon la rangee saute au chargement).
  const skel = SKELETON_SIZES[variant];
  // Variante sans gabarit connu : rien a habiller.
  if (!skel) return <DesignItemCard {...props} />;

  // ⚠️ REGLE CENTRALE — LA CARTE EST MONTEE DES LE PREMIER RENDU, cachee sous
  // le squelette. NE PAS remettre un `if (!ready) return <squelette>` : les
  // images de la carte ne seraient montees qu'au reveal et apparaitraient
  // quelques frames APRES la banniere. Voir architecture/restaurants.md,
  // section « RÈGLE CENTRALE ».
  return (
    <View>
      <Animated.View style={{ opacity: reveal }}>
        <DesignItemCard {...props} />
        <ItemMeta
          menu={menu}
          variant={variant}
          width={skel.width}
          marginRight={isLast ? 0 : skel.gap}
          deliveryHours={props.deliveryHours}
          orderLeadTime={props.orderLeadTime}
          index={props.index}
        />
      </Animated.View>
      {/* ⚠️ TOUJOURS MONTE, jamais derriere un `{!skeletonGone ? … : null}`.
          Sur une vue RECYCLEE (FlashList), ce cycle se rejouait et remontait le
          squelette a chaque reutilisation. La FORME de l'arbre ne doit dependre
          d'aucun etat : le squelette ne joue plus que sur son opacite. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            // Le bloc d'infos est rendu SOUS la carte : le voile s'arrete au
            // bas de la carte et ne le recouvre pas.
            bottom: undefined,
            height: skel.height,
            // La carte porte sa propre marge droite : le voile couvre la
            // carte, pas la gouttiere qui la suit.
            right: isLast ? 0 : skel.gap,
            borderRadius: skel.radius,
            overflow: "hidden",
            opacity: reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        {/* Image temoin : c'est elle qui signale le chargement au groupe.
            Meme URL que la carte dessous — expo-image dedoublonne la requete. */}
        {menu.image ? (
          <Image
            source={{ uri: menu.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={markResolved}
            onError={markResolved}
          />
        ) : null}
        <CardSkeleton radius={skel.radius} animating={!skeletonGone} />
      </Animated.View>
    </View>
  );
};
