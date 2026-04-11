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
            source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground1.png')} 
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
                source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground.png')} 
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
    const V4_COLORS = ['#f5f0ee', '#e8f4f8', '#f2e8f8', '#f8f2e8', '#e8f8f2', '#f8e8e8'];
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

  // --- DESIGN 5: FEATURED SELECTION (Ex-D1) ---
  if (variant === 5) {
    return (
      <TouchableOpacity style={styles.v5Card} onPress={onPress} activeOpacity={0.9}>
        <Image 
          source={menu.image ? { uri: menu.image } : require('@/assets/images/burger.png')} 
          style={styles.v5Image}
        />
        <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.v5Overlay}
        />
        <View style={styles.v5Badge}>
            <Text style={styles.v5BadgeText}>Top Pick</Text>
        </View>
        <View style={styles.v5Body}>
            <BlurView intensity={30} tint="dark" style={styles.v5Blur}>
                <Text style={styles.v5Title}>{menu.titre}</Text>
                <Text style={styles.v5Desc} numberOfLines={1}>{merchantName || 'Recommended'}</Text>
                <TouchableOpacity style={styles.v5Btn} onPress={onPress}>
                    <Text style={styles.v5BtnText}>Add to Cart</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 6: FLASH DEALS (Ex-D7) ---
  if (variant === 6) {
    return (
        <TouchableOpacity style={styles.v6Card} onPress={onPress} activeOpacity={0.9}>
            <Image 
                source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground.png')} 
                style={styles.v6FoodImg}
                contentFit="contain"
            />
            <View style={styles.v6Content}>
                <View style={styles.v6Top}>
                    <Text style={styles.v6Code}>Code <Text style={styles.v6CodeBadge}>VITE</Text></Text>
                </View>
                <Text style={styles.v6Title}>{menu.titre}</Text>
                <View style={styles.v6OrderBtn}>
                    <Text style={styles.v6OrderText}>Commander</Text>
                </View>
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

    // --- DESIGN 5 (Ex-D1) ---
    v5Card: { width: 220, height: 320, borderRadius: 24, marginRight: 16, overflow: 'hidden' },
    v5Image: { ...StyleSheet.absoluteFillObject },
    v5Overlay: { ...StyleSheet.absoluteFillObject },
    v5Badge: { position: 'absolute', top: 13, left: 13, backgroundColor: 'rgba(30,30,30,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    v5BadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
    v5Body: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    v5Blur: { flex: 1, padding: 14, justifyContent: 'flex-end' },
    v5Title: { fontSize: 18, fontWeight: '800', color: 'white' },
    v5Desc: { fontSize: 9, color: 'rgba(255,255,255,0.7)', marginVertical: 6 },
    v5Btn: { width: '100%', paddingVertical: 8, backgroundColor: 'white', borderRadius: 30, alignItems: 'center' },
    v5BtnText: { color: '#111', fontSize: 12, fontWeight: '700' },

    // --- DESIGN 6 (Ex-D7) ---
    v6Card: { width: 320, height: 160, backgroundColor: '#e8440a', borderRadius: 24, padding: 24, marginRight: 16, overflow: 'hidden' },
    v6FoodImg: { position: 'absolute', right: 4, top: 6, height: '90%', width: 140 },
    v6Content: { flex: 1, zIndex: 2 },
    v6Top: { marginBottom: 4 },
    v6Code: { color: 'white', fontSize: 13 },
    v6CodeBadge: { backgroundColor: 'white', color: '#e8440a', fontWeight: '800' },
    v6Title: { fontSize: 24, fontWeight: '900', color: 'white', lineHeight: 26, marginTop: 10, maxWidth: 180 },
    v6OrderBtn: { position: 'absolute', bottom: 0, left: 0, backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    v6OrderText: { color: '#f5c842', fontSize: 13, fontWeight: '800' },

    defaultContainer: { padding: 20, backgroundColor: 'white', marginRight: 16, borderRadius: 10 }
});
