import { CardSkeleton } from "@/src/components/CardSkeleton";
import { Theme } from "@/src/theme";
import { AppBanner } from "@/src/types";
import { Image } from "expo-image";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// ⚠️ `ScrollView` de gesture-handler, PAS celle de react-native. La ScrollView
// RN passe par le systeme de responder JS historique, qui s'arbitre mal avec la
// liste verticale parente : le geste part sur la banniere, l'enfant prend le
// responder, et la liste ne defile qu'apres la negociation — la pause au scroll
// en haut du home. Gesture-handler negocie en NATIF, la main est rendue tout de
// suite. Meme API, changement d'import uniquement.
import { REVEAL_MS, useShopReveal } from "../context/ShopRevealContext";
import { useBannerLoop } from "../hooks/useBannerLoop";

const { width } = Dimensions.get("window");

interface Props {
  /** Bannières publicitaires reçues via GET /fastfood/all (actives). */
  banners: AppBanner[];
  /** Action invoquée quand on tape une bannière de type `bonus`. */
  onBonusPress: (banner: AppBanner) => void;
  /**
   * Chargement du home en cours. Tant qu'il vaut `true` et qu'aucune bannière
   * n'est arrivée, on montre le squelette plutôt que le fallback statique.
   */
  loading?: boolean;
}

/**
 * Bannière publicitaire du home.
 *
 * S'il y a des bannières (carrousel), on affiche un carrousel horizontal
 * paginé (dots) qui sert chaque `imageUrl`. `type='bonus'` → on remonte
 * `onBonusPress` ; `type='none'` → aucun action au tap.
 *
 * S'il n'y a aucune bannière, on ne rend rien : l'échec du chargement est géré
 * par la home (écran d'erreur centré), les bannières arrivant dans la même
 * réponse que les boutiques.
 */
/**
 * ⚠️ PUCES DE PAGINATION DESACTIVEES — pause au scroll du home.
 *
 * Leur simple PRESENCE ramene la pause, quelle que soit leur implementation.
 * Ont ete testees et ecartees : puces pilotees par `useState`, puis par
 * `scrollX` sur le driver natif, avec interpolation de couleur, puis de largeur,
 * puis d'opacite seule, et avec `overflow: 'hidden'` sur leur rangee. Toutes
 * ramenent la pause ; les retirer la supprime.
 *
 * Ce n'est donc ni leur animation ni un re-rendu, mais leur presence ou leur
 * positionnement — cause non identifiee a ce jour. Repasser a `true` pour les
 * reafficher (tout le code reste en place).
 */
const DOTS_ENABLED = true;

/** Mettre a `true` pour figer le squelette et inspecter son rendu. */
const FORCE_SKELETON = false;

/**
 * Une banniere du carrousel : l'image plus le voile de chargement qui couvre
 * TOUTE la carte tant qu'elle n'est pas prete. Composant a part car chaque
 * banniere porte son propre etat de chargement.
 */
/**
 * Une banniere du carrousel. Elle ne porte PLUS son propre voile : celui-ci est
 * monte hors de la FlatList (voir `carouselOverlay`), sans quoi il n'etait
 * peint qu'apres le positionnement de la liste.
 */
function BannerImage({ uri, onReady }: { uri: string; onReady?: () => void }) {
  return (
    <Image
      source={{ uri }}
      style={styles.backgroundImage}
      contentFit="cover"
      cachePolicy="memory-disk"
      onLoad={() => onReady?.()}
    />
  );
}

function HeroBannerBase({ banners, onBonusPress, loading = false }: Props) {
  // ⚠️ UNE SEULE valeur pour tout le fondu de la banniere : l'image monte de 0
  // a 1 pendant que le squelette ET les puces-squelette descendent de 1 a 0,
  // par interpolation de cette meme valeur. Il y avait avant deux mecanismes
  // concurrents (le `transition` interne d'expo-image et le `fadeOut` du
  // squelette), de durees et de departs differents : ils ne pouvaient pas se
  // croiser au meme instant, et l'ecart variait a chaque ouverture.
  //
  // ⚠️ La banniere partage le groupe de la PREMIERE boutique (provider pose par
  // la home) : elle sort donc exactement avec son avatar et ses menus, sur la
  // meme valeur animee. Une animation identique ne suffisait pas — il faut la
  // MEME valeur, sinon chacun part quand SES images a lui sont pretes, et la
  // banniere (une seule image) gagnait toujours la course.
  const group = useShopReveal();
  const soloReveal = useRef(new Animated.Value(0)).current;
  const bannerReveal = group ? group.revealAnim : soloReveal;
  const skeletonOpacity = useMemo(
    () => bannerReveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    [bannerReveal],
  );

  // L'image effectivement visible au premier rendu : le carrousel demarre sur
  // la vraie premiere banniere (juste apres le clone de queue), donc toujours
  // `banners[0]`. C'est elle que le groupe attend — pas une diapo hors ecran.
  const firstUri = banners?.[0]?.imageUrl;
  // Inscription pendant le rendu : les effets tournent apres la fermeture de la
  // fenetre d'inscription du provider.
  if (group && firstUri) group.register(firstUri);

  // Le voile reste monte le temps de son fondu de sortie ; le retirer des
  // `onLoad` le faisait disparaitre d'un coup.
  const [skeletonGone, setSkeletonGone] = useState(false);
  // ⚠️ Seule la PREMIERE image compte. Le carrousel monte plusieurs items a la
  // fois : sans ce garde, une banniere hors ecran arrivee avant celle qu'on
  // regarde levait le voile sur une carte encore vide.
  const revealStartedRef = useRef(false);
  const markLoaded = useCallback(
    (uri: string) => {
      if (uri !== firstUri) return;
      if (group) {
        // C'est le groupe qui donnera le depart, quand la boutique 0 sera prete.
        group.resolve(uri);
        return;
      }
      if (revealStartedRef.current) return;
      revealStartedRef.current = true;
      Animated.timing(soloReveal, {
        toValue: 1,
        duration: REVEAL_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Le squelette respire en boucle : inutile de le garder sous une image
        // devenue opaque.
        if (finished) setSkeletonGone(true);
      });
    },
    [firstUri, group, soloReveal],
  );

  // Sous le groupe, le depart vient de lui : on demonte le voile une fois le
  // fondu ecoule.
  useEffect(() => {
    if (!group?.ready) return;
    const timer = setTimeout(() => setSkeletonGone(true), REVEAL_MS + 60);
    return () => clearTimeout(timer);
  }, [group?.ready]);
  // Mecanique du carrousel (diapos + clones, teleport, autoplay, puces) :
  // voir `useBannerLoop`, qui porte tout l'historique de la boucle infinie.
  const {
    slides,
    scrollRef,
    scrollX,
    hasCarousel,
    handleLayout,
    handleScrollBeginDrag,
    handleMomentumEnd,
  } = useBannerLoop(banners);

  // Memoise : l'evenement est branche sur le graphe animé NATIF, le recreer a
  // chaque rendu le detacherait puis le rattacherait.
  const onScrollEvent = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

  // Puces animees depuis `scrollX`, sans aucun etat React.
  //
  // ⚠️ Une puce s'active sur DEUX positions quand la boucle est active : la
  // banniere `i` est rendue par la diapo reelle `i + 1`, mais aussi par un clone
  // (la premiere reapparait en queue, la derniere en tete). Sans ce second point
  // d'ancrage, les puces s'eteindraient toutes en arrivant sur un clone.
  const dotViews = useMemo(() => {
    const n = banners.length;
    if (n <= 1) return null;
    const looped = slides.length === n + 2;
    return banners.map((b, i) => {
      // Position(s) de diapo qui affichent la banniere `i`.
      const anchors = looped
        ? [i + 1, i === 0 ? n + 1 : i === n - 1 ? 0 : -1]
        : [i];
      const points = anchors.filter((a) => a >= 0).sort((x, y) => x - y);

      // Rampe : largeur/couleur pleines sur chaque ancre, valeur de repos
      // ailleurs. `inputRange` doit rester STRICTEMENT croissant.
      const inputRange: number[] = [];
      const opacityRange: number[] = [];
      points.forEach((p) => {
        [
          [p - 1, 0],
          [p, 1],
          [p + 1, 0],
        ].forEach(([pos, o]) => {
          const x = pos * width;
          if (inputRange.length && x <= inputRange[inputRange.length - 1])
            return;
          inputRange.push(x);
          opacityRange.push(o);
        });
      });

      // ⚠️ NI largeur NI couleur : ces deux proprietes ne sont PAS prises en
      // charge par le driver natif. Les animer forcerait `scrollX` a repasser
      // par le thread JS a chaque frame — c'est ce qui ramenait la pause au
      // scroll du home. Seule l'OPACITE est native : la puce active est un
      // calque superpose qu'on fait apparaitre, la puce grise reste dessous.
      return (
        <View key={b.id} style={styles.dotSlot}>
          <View style={styles.dot} />
          <Animated.View
            style={[
              styles.dotActiveOverlay,
              {
                opacity: scrollX.interpolate({
                  inputRange,
                  outputRange: opacityRange,
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        </View>
      );
    });
  }, [banners, slides.length, scrollX]);

  // Diapos memoisees : les interpolations sont branchees sur le graphe animé
  // NATIF, les recreer a chaque rendu detacherait puis rattacherait autant de
  // noeuds natifs. Les puces (`activeIndex`) ne sont volontairement PAS dans
  // les dependances : elles changent a chaque page, les images non.
  const slideViews = useMemo(
    () =>
      slides.map((item, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        // TEST TEMPORAIRE : sans animation, la diapo garde sa geometrie mais
        // n'accroche aucun noeud anime natif. Voir CAROUSEL_ANIM_ENABLED.
        // ⚠️ Sous `PagerView`, `scrollX` n'est alimente par rien : la vue native
        // n'emet pas d'evenement de scroll continu. Les interpolations
        // resteraient donc figees a leur valeur de depart (echelle 0.4), ce qui
        // reduirait toutes les diapos. On les neutralise dans ce mode.
        // ⚠️ La ScrollView est desormais NUE (pas de `onScroll`) : `scrollX`
        // n'est alimente par rien, les interpolations resteraient figees a
        // l'echelle 0.4. Animation neutralisee tant que c'est le cas.
        const animStyle = true
          ? {
              transform: [
                {
                  scale: scrollX.interpolate({
                    inputRange,
                    outputRange: [0.4, 1, 0.4],
                    extrapolate: "clamp",
                  }),
                },
              ],
              opacity: scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1, 0.8],
                extrapolate: "clamp",
              }),
            }
          : null;

        return (
          // ⚠️ Sous `PagerView`, chaque enfant EST une page : il doit la remplir
          // (`flex: 1`), la largeur fixe des diapos de la ScrollView ne suffit
          // pas a lui donner sa hauteur.
          <View key={item.slideKey} style={styles.bannerItemContainer}>
            <Animated.View style={[styles.animatedWrapper, animStyle]}>
              <TouchableOpacity
                style={styles.bannerWrapper}
                activeOpacity={0.9}
                disabled={item.type !== "bonus"}
                onPress={() => item.type === "bonus" && onBonusPress(item)}
              >
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    FORCE_SKELETON ? { opacity: 0 } : { opacity: bannerReveal },
                  ]}
                >
                  <BannerImage
                    uri={item.imageUrl}
                    onReady={() => markLoaded(item.imageUrl)}
                  />
                </Animated.View>
                {item.title ? (
                  <View style={styles.overlay}>
                    <Text style={styles.bannerTitle}>{item.title}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </Animated.View>
          </View>
        );
      }),
    [slides, scrollX, bannerReveal, onBonusPress, markLoaded],
  );

  // ⚠️ Chargement en cours et aucune banniere encore recue : on affiche le
  // SQUELETTE, pas le fallback statique. Sinon la promo « Get 50% Off » (une
  // image locale, donc instantanee) s'affichait une fraction de seconde avant
  // d'etre remplacee par les vraies bannieres — un clignotement a chaque
  // ouverture du home.
  if (loading && !hasCarousel) {
    return (
      <View style={styles.container}>
        <View style={styles.bannerItemContainer}>
          <View style={styles.bannerWrapper}>
            <CardSkeleton radius={24} />
          </View>
        </View>
        {/* Un seul point, plus large : on ignore combien de bannieres
            arriveront, afficher 3 puces figerait une mise en page fausse. */}
        <View style={styles.dotsRow}>
          <View style={styles.dotSkeleton}>
            <CardSkeleton radius={4} />
          </View>
        </View>
      </View>
    );
  }

  // ⚠️ Plus de banniere promo statique en secours. Elle etait locale, donc
  // peinte instantanement, et s'inserait avant les vraies bannieres — d'ou le
  // clignotement et la page blanche sans squelette. Sans banniere, on ne rend
  // RIEN : l'echec du chargement est traite par la home, qui affiche un ecran
  // d'erreur centre a la place de toute la page.
  if (!hasCarousel) return null;

  return (
    <View style={styles.container}>
      {/* ⚠️ Voile monte HORS du carrousel, et rendu avant lui. Le squelette
          vivait dans les diapos : il attendait donc que le carrousel se
          positionne avant d'etre peint — c'est ce qui le faisait arriver en
          retard alors que les cartes etaient deja la. Ici c'est une simple
          `View` en absolu : elle est peinte des la premiere passe, quel que
          soit l'etat du carrousel dessous. Elle couvre aussi le repositionnement
          initial de `handleLayout`, qui devient donc invisible. */}
      {(FORCE_SKELETON || !skeletonGone) && (
        <Animated.View
          style={[
            styles.carouselOverlay,
            FORCE_SKELETON ? null : { opacity: skeletonOpacity },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.bannerItemContainer, { height: "100%" }]}>
            <View style={styles.bannerWrapper}>
              {/* Le fondu de sortie n'est plus gere par `CardSkeleton` : il
                  suit ici l'inverse exact du fondu d'entree de l'image. */}
              <CardSkeleton radius={24} />
            </View>
          </View>
        </Animated.View>
      )}
      {/* ⚠️ `ScrollView` et non `FlatList` : a N + 2 diapos il n'y a rien a
          virtualiser, et cela retire du header (jamais virtualise par la liste
          du home) toute la mecanique `VirtualizedList` — fenetre de rendu,
          viewabilite, cascade de montage. Voir `useBannerLoop`. */}
      {
        <Animated.ScrollView
          ref={scrollRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={handleLayout}
          onScrollBeginDrag={handleScrollBeginDrag}
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
        >
          {slideViews}
        </Animated.ScrollView>
      }
      {/* Les puces suivent l'image sur la MEME valeur : elles ne peuvent plus
          apparaitre a cote d'une banniere encore en squelette. */}
      {/* ⚠️ Les puces sont pilotees par `scrollX` sur le driver NATIF, JAMAIS par
          un `useState`.

          C'ETAIT LA CAUSE DE LA PAUSE AU SCROLL DU HOME. Elles lisaient un
          `activeIndex` d'etat, mis a jour a chaque changement de page. Or tout
          `setState` ici re-rend `HeroBanner`, donc les N + 2 diapos et leurs
          interpolations : ~130 ms de blocage JS, tombant precisement au
          chargement et au retour en haut, la ou la position du carrousel est
          reevaluee. Les sondes le montraient — `[BANNER] rendu` juste avant
          chaque `[JS] blocage`.

          Ici chaque puce interpole sa propre largeur et sa couleur depuis la
          MEME valeur animee que les diapos. L'etat vit dans le graphe natif :
          aucun rendu React, quel que soit le nombre de pages parcourues. */}
      {DOTS_ENABLED && banners.length > 1 && (
        <View style={styles.dotsRow}>
          {!skeletonGone && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.dotsLayer,
                StyleSheet.absoluteFillObject,
                { justifyContent: "center" },
                { opacity: skeletonOpacity },
              ]}
            >
              <View style={styles.dotSkeleton}>
                <CardSkeleton radius={4} />
              </View>
            </Animated.View>
          )}
          <Animated.View
            style={[
              styles.dotsLayer,
              FORCE_SKELETON ? { opacity: 0 } : { opacity: bannerReveal },
            ]}
          >
            {dotViews}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

export const HeroBanner: React.FC<Props> = memo(HeroBannerBase);

const styles = StyleSheet.create({
  container: {
    width,
    // marginHorizontal: -Theme.design.horizontalPadding,
    marginHorizontal: -Theme.design.horizontalPadding,
    marginTop: 4,
    marginBottom: 10,
  },
  // ⚠️ Hauteur EXPLICITE : `PagerView` est une vue native, elle ne se dimensionne
  // pas sur son contenu comme une `ScrollView`. Doit valoir la hauteur d'une
  // diapo (`animatedWrapper`), sinon la banniere ne s'affiche pas.
  pager: {
    width,
    height: 210,
  },
  // Superpose au carrousel, a la meme geometrie que ses items.
  carouselOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 210,
    zIndex: 5,
  },
  bannerItemContainer: {
    width,
    paddingHorizontal: 4,
  },
  animatedWrapper: {
    width: "100%",
    height: 210,
  },
  bannerWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
    // Fond neutre : l'orange de marque restait visible pendant tout le
    // telechargement de la banniere. Le skeleton couvre desormais l'attente.
    backgroundColor: "#eef1f5",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    padding: 24,
    zIndex: 2,
  },
  bannerTitle: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Hauteur fixe : les deux couches de puces (squelette et reelles) sont
  // superposees le temps du fondu croise, la ligne ne doit pas bouger.
  // ⚠️ Hauteur fixe ET `overflow: 'hidden'`. Les deux couches de puces
  // (squelette et reelles) se superposent en absolu le temps du fondu croise :
  // sans cette borne, un enfant absolu deborde de son parent de 7 px de haut, et
  // la cellule banniere doit etre remesuree par la FlatList — ce qui invalide
  // ses metriques de virtualisation au moment meme ou la fenetre de rendu est
  // reevaluee (chargement, retour en haut). C'etait la pause au scroll du home.
  // Pastille sombre arrondie posee EN BAS DE LA BANNIERE (dans le carrousel),
  // et non plus sous lui. Hauteur fixe + `overflow: 'hidden'` conserves : les
  // deux couches de puces se superposent en absolu pendant le fondu croise.
  dotsRow: {
    position: "absolute",
    bottom: -25,
    alignSelf: "center",
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    // backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    zIndex: 10,
  },
  dotsLayer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#d8d2ce",
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: Theme.colors.primary,
    width: 18,
  },
  // ⚠️ Emplacement de LARGEUR FIXE (celle de la puce active) : la puce grise et
  // le calque actif s'y superposent. Animer la largeur ferait repasser `scrollX`
  // par le thread JS — le driver natif ne gere que l'opacite et les transforms.
  dotSlot: {
    width: 12,
    height: 7,
    marginHorizontal: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: Theme.colors.primary,
  },
  // Une seule puce, a la largeur de la puce active : le nombre de bannieres
  // n'est pas encore connu au moment du squelette.
  dotSkeleton: {
    width: 18,
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    marginHorizontal: 3,
  },
});
