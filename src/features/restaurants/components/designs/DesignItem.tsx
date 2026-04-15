import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Menu } from '@/src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const V1_COLORS = ['#e8440a', '#6c5ce7', '#00b894', '#e67e22', '#e67e22', '#e67e22', '#2d3436', '#00b894'];
const V1_COLORS2 = ['#e8440a', '#6c5ce7', '#00b894', '#e67e22', '#e67e22', '#e67e22', '#2d3436', '#00b894'];

interface DesignItemProps {
  menu: Menu;
  variant: number;
  merchantName?: string;
  onPress: () => void;
  index?: number;
}

export const DesignItem: React.FC<DesignItemProps> = ({ menu, variant, merchantName, onPress, index = 0 }) => {
  const isAvailable = menu.disponibilite === 'available' || menu.disponibilite === 'Disponible';
  const price = `${menu.prix1} F`;

  // --- DESIGN 1: SPECIAL OFFERS (Ex-D3) ---
  if (variant === 1) {
    const bgImage = index === 0 
      ? require('@/assets/images/purre avocat tomate legume flouter.png')
      : require('@/assets/images/purre avocat tomate legume flouter.png');

    return (
      <TouchableOpacity style={styles.v1Card} onPress={onPress} activeOpacity={0.9}>
        <Image 
          source={bgImage} 
          style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.5 }] }]}
          contentFit="cover"
        />
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        
        <View style={styles.v1Header}>
          <BlurView intensity={60} tint="dark" style={styles.v1LabelBlur}>
            <Text style={styles.v1Label}>{menu.titre}</Text>
          </BlurView>
          <BlurView intensity={60} tint="dark" style={styles.v1Heart}>
            <Ionicons name="heart" size={16} color="#e8440a" />
          </BlurView>
        </View>
        
        <BlurView intensity={80} tint="dark" style={styles.v1ValBlur}>
          <Text style={styles.v1Val}>{price}</Text>
        </BlurView>
 
        <View style={styles.v1ImgWrapper}>
          <Image 
            source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground1.webp')} 
            style={styles.v1Image} 
            contentFit="contain"
          />
          <BlurView intensity={60} tint="dark" style={styles.v1BadgeTime}>
            <Ionicons name="time-outline" size={12} color="white" />
            <Text style={styles.v1BadgeTextDetail}>5 mins</Text>
          </BlurView>
          <BlurView intensity={60} tint="dark" style={styles.v1BadgeCal}>
            <Text style={styles.v1BadgeTextDetail}>350 cal</Text>
          </BlurView>
        </View>
        <BlurView intensity={60} tint="dark" style={styles.v1BrandBar}>
          <View style={styles.v1BrandIcon}><Text style={styles.v1BrandInitial}>{merchantName?.charAt(0) || 'Y'}</Text></View>
          <Text style={styles.v1BrandName}>{merchantName || 'Yaammoo'}</Text>
        </BlurView>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 2: RICE & SALAD (Ex-D4) ---
  if (variant === 2) {
    return (
      <TouchableOpacity style={styles.v2Card} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.v2ImgWrap}>
          <Image 
            source={menu.image ? { uri: menu.image } : require('@/assets/images/riz_Spaghettis et Œuf_poulet_pané_fritz_platain_noBG.png')} 
            style={styles.v2Image} 
          />
        </View>
        <View style={styles.v2Rating}>
            <Text style={styles.v2RatingText}>★ 5.0</Text>
        </View>
        <Text style={styles.v2Name} numberOfLines={1}>{menu.titre}</Text>
        <Text style={styles.v2Desc} numberOfLines={1}>{merchantName || 'Restaurant'}</Text>
        <View style={styles.v2Footer}>
            <Text style={styles.v2Price}>{price}</Text>
            <View style={styles.v2CartBtn}>
                <Ionicons name="cart-outline" size={16} color="white" />
            </View>
        </View>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 3: POPULAR MENU (Ex-D2) ---
  if (variant === 3) {
    return (
      <TouchableOpacity style={styles.v3Card} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.v3ImgBox}>
            <Image 
                source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground.webp')} 
                style={styles.v3Image}
                contentFit="contain"
            />
        </View>
        <Text style={styles.v3Price}>{price}</Text>
        <Text style={styles.v3Desc} numberOfLines={1}>{menu.titre}</Text>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 4: PIZZA SPECIALS (Ex-D5) ---
  if (variant === 4) {
    const V4_COLORS = [
      '#fdeded', // Orange
      '#f5f0ee', // Neutre/Lin
      '#e8f4f8', // Bleu ciel
      '#f2e8f8', // Lavande
      '#f8f2e8', // Pêche
      '#e8f8f2', // Menthe
      '#f8e8e8', // Rose
      '#fdf2e9', // Orange
      '#fdeded', // Rouge Corail
      '#ebf5eb'  // Vert Émeraude
    ];
    const bgColor = V4_COLORS[index % V4_COLORS.length];

    return (
      <TouchableOpacity style={[styles.v4Card, { backgroundColor: bgColor }]} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.v4Text}>
            <Text style={styles.v4Title}>{menu.titre}</Text>
            <Text style={styles.v4Price}>{price}</Text>
        </View>
        <View style={styles.v4ImgWrap}>
            <Image 
                source={menu.image ? { uri: menu.image } : require('@/assets/images/purre avocat tomate legume .png')} 
                style={styles.v4Image}
            />
        </View>
      </TouchableOpacity>
    );
  }

  // Default Variant
  return (
    <TouchableOpacity style={styles.defaultContainer} onPress={onPress}>
      <Text>{menu.titre}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    // --- DESIGN 1 (Ex-D3) ---
    v1Card: { width: 260, height: 280, borderRadius: 32, paddingHorizontal:14, paddingVertical: 14, marginRight: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
    v1Header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 30 },
    v1Heart: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    v1LabelBlur: { borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start', marginRight: 10 },
    v1Label: { color: 'white', fontSize: 13, fontWeight: '500', paddingHorizontal: 10, paddingVertical: 6 },
    v1ValBlur: {position: 'relative', top: 5, left: 5, alignSelf: 'flex-start', borderRadius: 12, overflow: 'hidden', zIndex: 20, marginTop: 2 },
    v1Val: { color: 'white', fontSize: 22, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 2 },
    v1ImgWrapper: { flex: 1, marginTop: 0, alignItems: 'center' },
    v1Image: { width: '100%', height: '100%', transform: [{ scale: 1.6 }, { rotate: '-10deg' }] },
    v1BrandBar: { borderRadius: 20, padding: 6, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 10, overflow: 'hidden' },
    v1BrandIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f96f62', alignItems: 'center', justifyContent: 'center' },
    v1BrandInitial: { color: 'white', fontWeight: '800', fontSize: 14 },
    v1BrandName: { color: 'white', fontSize: 15, fontWeight: '600', marginLeft: 8, marginRight: 8 },
    v1BadgeTime: { position: 'absolute', top: 50, right: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4,overflow: 'hidden' },
    v1BadgeCal: { position: 'absolute', top: 110, left: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,overflow: 'hidden' },
    v1BadgeTextDetail: { color: 'white', fontSize: 11, fontWeight: '500' },

    // --- DESIGN 2 (Ex-D4) ---
    v2Card: { width: 220, backgroundColor: 'white', borderRadius: 22, padding: 14, marginRight: 16, borderWidth: 1, borderColor: '#efefef' },
    v2ImgWrap: { width: '100%', height: 140, borderRadius: 16, overflow: 'hidden' },
    v2Image: { width: 130, height: 130,marginLeft:-3 },
    v2Rating: { position: 'absolute', top: 18, right: 18, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    v2RatingText: { fontSize: 10, fontWeight: '700', color: '#222' },
    v2Name: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: 10 },
    v2Desc: { fontSize: 10, color: '#aaa', marginVertical: 4 },
    v2Footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    v2Price: { fontSize: 15, fontWeight: '800', color: '#111' },
    v2CartBtn: { width: 34, height: 34, backgroundColor: '#2d6e65', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // --- DESIGN 3 (Ex-D2) ---
    v3Card: { width: 120, backgroundColor: 'white', borderRadius: 20, padding: 14, marginRight: 16, borderWidth: 1, borderColor: '#efefef', alignItems: 'center' },
    v3ImgBox: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center' },
    v3Image: { width: '110%', height: '110%' },
    v3Price: { fontSize: 16, fontWeight: '800', color: '#111', marginTop: 4, textAlign: 'center' },
    v3Desc: { fontSize: 10, color: '#999', marginTop: 2, textAlign: 'center' },

    // --- DESIGN 4 (Ex-D5) ---
    v4Card: { width: 240, height: 320, borderRadius: 28, marginRight: 16, overflow: 'hidden' },
    v4Text: { padding: 24, zIndex: 2 },
    v4Title: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', lineHeight: 26 },
    v4Price: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
    v4ImgWrap: { position: 'absolute', bottom: -20, right: -40, width: 220, height: 220, zIndex: 1 },
    v4Image: { width: '110%', height: '110%', borderRadius: 110 },

    defaultContainer: { padding: 20, backgroundColor: 'white', marginRight: 16, borderRadius: 10 }
});
