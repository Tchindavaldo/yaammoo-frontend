import { Theme } from '@/src/theme';
import { AppBanner } from '@/src/types';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CardSkeleton } from '@/src/components/CardSkeleton';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ViewToken } from 'react-native';

const { width } = Dimensions.get('window');
/**
 * Nombre de repetitions de la liste pour simuler une boucle infinie.
 *
 * ⚠️ Etait a 50 : avec 3 bannieres, cela faisait 150 items et un
 * `initialScrollIndex` a 75. La FlatList devait se positionner la avant de
 * peindre quoi que ce soit — d'ou un blanc visible avant meme l'apparition du
 * squelette, alors que les cartes, elles, etaient instantanees. 10 repetitions
 * suffisent largement a ne jamais atteindre le bord en usage reel.
 */
const LOOP_MULTIPLIER = 10;

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
 * Defilement automatique du carrousel. Desactive : le scroll auto reprenait la
 * main pendant la lecture d'une banniere. Repasser a `true` pour le retablir
 * (toute la mecanique autoplay/pause reste en place).
 */
const AUTOPLAY_ENABLED = false;

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
      transition={180}
      onLoad={() => onReady?.()}
    />
  );
}

function HeroBannerBase({ banners, onBonusPress, loading = false }: Props) {
  // ⚠️ Les puces suivent l'image, pas la donnee. Elles etaient rendues des que
  // `banners` arrivait — donc a cote d'une banniere encore en squelette. Elles
  // restent en squelette tant que la premiere image n'est pas peinte.
  const [firstBannerLoaded, setFirstBannerLoaded] = useState(false);
  // Le voile reste monte le temps de son fondu de sortie ; le retirer des
  // `onLoad` le faisait disparaitre d'un coup.
  const [skeletonGone, setSkeletonGone] = useState(false);
  // ⚠️ Seule la PREMIERE image compte. Le carrousel monte plusieurs items a la
  // fois : sans ce garde, une banniere hors ecran arrivee avant celle qu'on
  // regarde levait le voile sur une carte encore vide.
  const markLoaded = useCallback(() => setFirstBannerLoaded(true), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const currentIndexRef = useRef(0);

  const hasCarousel = Array.isArray(banners) && banners.length > 0;

  // Répétition des bannières pour créer l'effet de boucle infinie
  const extendedBanners = useMemo(() => {
    if (!banners || banners.length <= 1) return banners || [];
    const list: (AppBanner & { uniqueId: string })[] = [];
    for (let i = 0; i < LOOP_MULTIPLIER; i++) {
      banners.forEach((b, idx) => {
        list.push({ ...b, uniqueId: `${b.id}_${i}_${idx}` });
      });
    }
    return list;
  }, [banners]);

  const initialIndex = useMemo(() => {
    if (!banners || banners.length <= 1) return 0;
    return Math.floor(LOOP_MULTIPLIER / 2) * banners.length;
  }, [banners]);

  useEffect(() => {
    if (initialIndex > 0) {
      currentIndexRef.current = initialIndex;
    }
  }, [initialIndex]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const nextIndex = currentIndexRef.current + 1;
      currentIndexRef.current = nextIndex;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * width,
        animated: true,
      });
    }, 3500);
  }, []);

  // Initialisation de l'autoplay au montage
  useEffect(() => {
    if (!AUTOPLAY_ENABLED || !hasCarousel || banners.length <= 1) return;

    startAutoplay();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [hasCarousel, banners.length, startAutoplay]);

  // Pause de 20s lors d'un slide manuel de l'utilisateur
  const handleScrollBeginDrag = useCallback(() => {
    if (!AUTOPLAY_ENABLED) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    pauseTimeoutRef.current = setTimeout(() => {
      startAutoplay();
    }, 20000);
  }, [startAutoplay]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems?.[0];
      if (first?.index != null) {
        currentIndexRef.current = first.index;
        if (banners.length > 0) {
          setActiveIndex(first.index % banners.length);
        }
      }
    },
    [banners.length],
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
      {/* ⚠️ Voile monte HORS de la FlatList du carrousel, et rendu avant elle.
          Le squelette vivait dans les items : il attendait donc que la liste se
          positionne sur `initialScrollIndex` avant d'etre peint — c'est ce qui
          le faisait arriver en retard alors que les cartes etaient deja la. Ici
          c'est une simple `View` en absolu : elle est peinte des la premiere
          passe, quel que soit l'etat de la liste dessous. */}
      {(FORCE_SKELETON || !skeletonGone) && (
        <View style={styles.carouselOverlay} pointerEvents="none">
          <View style={[styles.bannerItemContainer, { height: '100%' }]}>
            <View style={styles.bannerWrapper}>
              <CardSkeleton
                radius={24}
                fadeOut={firstBannerLoaded && !FORCE_SKELETON}
                onFadedOut={() => setSkeletonGone(true)}
              />
            </View>
          </View>
        </View>
      )}
      <Animated.FlatList
        ref={flatListRef as any}
        data={extendedBanners as any}
        keyExtractor={(item: any) => item.uniqueId || item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.40, 1, 0.40],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
          });

          return (
            <View style={styles.bannerItemContainer}>
              <Animated.View style={[styles.animatedWrapper, { transform: [{ scale }], opacity }]}>
                <TouchableOpacity
                  style={styles.bannerWrapper}
                  activeOpacity={0.9}
                  disabled={item.type !== 'bonus'}
                  onPress={() => item.type === 'bonus' && onBonusPress(item)}
                >
                  <BannerImage uri={item.imageUrl} onReady={markLoaded} />
                  {item.title ? (
                    <View style={styles.overlay}>
                      <Text style={styles.bannerTitle}>{item.title}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        }}
      />
      {banners.length > 1 && !skeletonGone && (
        <View style={styles.dotsRow}>
          <View style={styles.dotSkeleton}>
            <CardSkeleton radius={4} />
          </View>
        </View>
      )}
      {banners.length > 1 && skeletonGone && (
        <View style={styles.dotsRow}>
          {banners.map((b, i) => (
            <View
              key={b.id}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
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
  // Superpose au carrousel, a la meme geometrie que ses items.
  carouselOverlay: {
    position: 'absolute',
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
    width: '100%',
    height: 210,
  },
  bannerWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    // Fond neutre : l'orange de marque restait visible pendant tout le
    // telechargement de la banniere. Le skeleton couvre desormais l'attente.
    backgroundColor: '#eef1f5',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    padding: 24,
    zIndex: 2,
  },
  bannerTitle: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d8d2ce',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: Theme.colors.primary,
    width: 18,
  },
  // Une seule puce, a la largeur de la puce active : le nombre de bannieres
  // n'est pas encore connu au moment du squelette.
  dotSkeleton: {
    width: 18,
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 3,
  },
});
