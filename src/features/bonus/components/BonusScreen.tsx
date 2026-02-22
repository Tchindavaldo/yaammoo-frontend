import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { useBonus } from '@/src/features/bonus/hooks/useBonus';
import { BonusCard } from '@/src/features/bonus/components/BonusCard';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.75;
const CARD_MARGIN = 12;

export const BonusScreen: React.FC = () => {
  const { bonuses, loading, postingId, getBonusEligibility, claimBonus, paidOrderCount, refresh } = useBonus();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_MARGIN * 2));
    setCurrentIndex(idx);
  };

  const scrollLeft = () => {
    const next = Math.max(0, currentIndex - 1);
    scrollRef.current?.scrollTo({ x: next * (CARD_W + CARD_MARGIN * 2), animated: true });
    setCurrentIndex(next);
  };

  const scrollRight = () => {
    const next = Math.min(bonuses.length - 1, currentIndex + 1);
    scrollRef.current?.scrollTo({ x: next * (CARD_W + CARD_MARGIN * 2), animated: true });
    setCurrentIndex(next);
  };

  const handleClaim = async (bonus: any) => {
    const { eligible, totalBonus } = getBonusEligibility(bonus.order_count, bonus.type);
    const isWelcome = bonus.type === 'welcome_bonus';

    if (!isWelcome && !eligible) return;

    try {
      await claimBonus(bonus.id, bonus.type, totalBonus);
      Alert.alert(
        '✨ Demande envoyée !',
        '🎉 Vous recevrez une notification avec tous les détails.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={20} color="white" />
        <Text style={styles.headerText}>Mes Bonus</Text>
        <Text style={styles.orderCount}>{paidOrderCount} commandes</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Chargement des bonus...</Text>
        </View>
      ) : bonuses.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="gift-outline" size={60} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>Aucun bonus disponible</Text>
        </View>
      ) : (
        <>
          {/* Carousel */}
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + CARD_MARGIN * 2}
            decelerationRate="fast"
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumEnd}
            scrollEventThrottle={16}
          >
            {bonuses.map((bonus) => {
              const { eligible, restant } = getBonusEligibility(bonus.order_count, bonus.type);
              return (
                <BonusCard
                  key={bonus.id}
                  bonus={bonus}
                  orderCount={paidOrderCount}
                  eligible={eligible}
                  restant={restant}
                  onClaim={() => handleClaim(bonus)}
                  claiming={postingId === bonus.id}
                />
              );
            })}
          </Animated.ScrollView>

          {/* Indicateurs */}
          <View style={styles.dots}>
            {bonuses.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Boutons navigation */}
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navBtn} onPress={scrollLeft}>
              <Text style={styles.navBtnText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={scrollRight}>
              <Text style={styles.navBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0404',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
  },
  headerText: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderCount: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: SCREEN_W * 0.125,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    fontSize: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: Theme.colors.primary,
    width: 20,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  navBtn: {
    backgroundColor: 'rgba(190,30,30,0.3)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#be1e1e',
  },
  navBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
