import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Bonus } from '@/src/features/bonus/hooks/useBonus';
import { BlurView } from 'expo-blur';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.75;

interface BonusCardProps {
  bonus: Bonus;
  orderCount: number;
  eligible: boolean;
  restant: number;
  onClaim: () => void;
  claiming: boolean;
}

export const BonusCard: React.FC<BonusCardProps> = ({
  bonus,
  orderCount,
  eligible,
  restant,
  onClaim,
  claiming,
}) => {
  const isWelcome = bonus.type === 'welcome_bonus';

  return (
    <View style={styles.card}>
      {/* Fond décoratif */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Badge de type */}
      {bonus.isFastFoodBonus && (
        <View style={styles.ffBadge}>
          <Ionicons name="storefront-outline" size={12} color="white" />
          <Text style={styles.ffBadgeText}>FastFood</Text>
        </View>
      )}

      {/* Image illustrative */}
      <Image
        source={{ uri: 'https://via.placeholder.com/100' }}
        style={styles.bonusImage}
      />

      {/* Nom du bonus */}
      <View style={styles.nameBadge}>
        <Text style={styles.nameText}>{bonus.data.name}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>{bonus.data.description}</Text>

      {/* Progression */}
      {bonus.type === 'order_count_bonus' && (
        <View style={styles.progressBlock}>
          <Text style={styles.progressLabel}>
            Commandes restantes pour être éligible
          </Text>
          <Text style={styles.progressValue}>{restant}</Text>
        </View>
      )}

      {/* Bouton */}
      <View style={styles.btnRow}>
        {!isWelcome && !eligible ? (
          <View style={styles.ineligibleBadge}>
            <Text style={styles.ineligibleText}>NON ÉLIGIBLE</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
            onPress={onClaim}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.claimBtnText}>Recevoir</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: '#1a0a0a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 380,
    justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(190,30,30,0.2)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(190,30,30,0.1)',
  },
  ffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#be1e1e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
    gap: 4,
  },
  ffBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bonusImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#be1e1e',
    marginBottom: 16,
  },
  nameBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  nameText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
  progressValue: {
    color: '#be1e1e',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 4,
  },
  btnRow: {
    marginTop: 8,
  },
  ineligibleBadge: {
    backgroundColor: '#be1e1e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ineligibleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  claimBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  claimBtnDisabled: {
    opacity: 0.6,
  },
  claimBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
