import { Theme } from '@/src/theme';
import { AppBanner } from '@/src/types';
import { Image } from 'expo-image';
import { CardSkeleton } from '@/src/components/CardSkeleton';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ViewToken } from 'react-native';

const { width } = Dimensions.get('window');
const LOOP_MULTIPLIER = 50;

interface Props {
  /** Bannières publicitaires reçues via GET /fastfood/all (actives). */
  banners: AppBanner[];
  /** Action invoquée quand on tape une bannière de type `bonus`. */
  onBonusPress: (banner: AppBanner) => void;
}

/**
 * Bannière publicitaire du home.
 *
 * S'il y a des bannières (carrousel), on affiche un carrousel horizontal
 * paginé (dots) qui sert chaque `imageUrl`. `type='bonus'` → on remonte
 * `onBonusPress` ; `type='none'` → aucun action au tap.
 *
 * S'il n'y a aucune bannière active côté backend, on retombe sur l'ancienne
 * bannière statique embarquée (image locale + code promo) pour ne jamais
 * laisser le home vide.
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
function BannerImage({ uri }: { uri: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <Image
        source={{ uri }}
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={180}
        onLoad={() => setLoaded(true)}
      />
      {(FORCE_SKELETON || !loaded) && <CardSkeleton radius={24} />}
    </>
  );
}

function HeroBannerBase({ banners, onBonusPress }: Props) {
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

  if (!hasCarousel) {
    return (
      <View style={styles.container}>
        <View style={styles.bannerItemContainer}>
          <View style={styles.bannerWrapper}>
            <Image
              source={require('@/assets/images/banner-shawamar.webp')}
              style={styles.backgroundImage}
              contentFit="cover"
            />
            <View style={styles.overlay}>
              <View style={styles.topLine}>
                <Text style={styles.codeText}>Use code </Text>
                <View style={styles.codeBadge}>
                  <Text style={styles.badgeText}>FIRST50</Text>
                </View>
              </View>
              <Text style={styles.hurry}>Offer ends soon!</Text>
              <Text style={styles.bigTitle}>Get 50% Off Your{"\n"}First Order!</Text>

              <TouchableOpacity style={styles.orderBtn} activeOpacity={0.8}>
                <Text style={styles.orderBtnText}>Order Now</Text>
              </TouchableOpacity>
            </View>

            {/* Decorative Blobs */}
            <View style={[styles.blob, styles.blob1]} />
            <View style={[styles.blob, styles.blob2]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                  <BannerImage uri={item.imageUrl} />
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
      {banners.length > 1 && (
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
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  codeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  codeBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    color: '#e8440a',
    fontSize: 12,
    fontWeight: '900',
  },
  hurry: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
  },
  bigTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: 'white',
    lineHeight: 30,
  },
  orderBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    zIndex: 10,
  },
  orderBtnText: {
    color: '#f5c842',
    fontSize: 14,
    fontWeight: '900',
  },
  blob: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blob1: {
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -60,
    left: -40,
  },
  blob2: {
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -50,
    left: 80,
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
});
