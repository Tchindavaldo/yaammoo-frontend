import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
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
        
        {/* <BlurView intensity={80} tint="dark" style={styles.v1ValBlur}>
          <Text style={styles.v1Val}>{price}</Text>
        </BlurView> */}
 
        <View style={styles.v1ImgWrapper}>
          <Image 
            source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground1.webp')} 
            style={styles.v1Image} 
            contentFit="contain"
          />
          <BlurView intensity={60} tint="dark" style={styles.v1BadgeTime}>
            <Ionicons name="time-outline" size={12} color="white" />
            {/* <Text style={styles.v1BadgeTextDetail}>3500 f</Text> */}
             <Text style={styles.v1Val}>{price} </Text>
          </BlurView>
          <BlurView intensity={60} tint="dark" style={styles.v1BadgeCal}>
            <Text style={styles.v1BadgeTextDetail}>350 cal</Text>
          </BlurView>
        </View>
         
        <BlurView intensity={60} tint="dark" style={styles.v1BrandBar}>
          <View style={styles.v2Delivery}>
  <View style={styles.v2DeliveryTimer}>
    <Text style={styles.v2DeliveryHour}>12</Text>
    <Text style={styles.v2DeliveryUnit}>heure</Text>
  </View>
  <View style={{ flexShrink: 1 }}>
    <Text style={styles.v2DeliveryMeta}>Prochaine livraison</Text>
    <Text style={styles.v2DeliveryMain}>40 Disponible</Text>
  </View>
  <View style={styles.v2DeliveryDot} />
</View>
        </BlurView>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 2: RICE & SALAD (Ex-D4) ---
  if (variant === 2) {
    return (
      <TouchableOpacity style={styles.v2Card} onPress={onPress} activeOpacity={0.8}>
        
          {/* Badge dispo  */} 
         <View style={styles.v2DispoBadge}>
            <View style={styles.v2DispoPulse} />
            <Text style={styles.v2DispoText}>
              <Text style={{ color: '#4faa71ff', fontWeight: '900' }}>40</Text>
              <Text style={{ color: '#666' }}> En Stock</Text>
            </Text>
          </View>
        {/* Image avec overlay gradient */}
        <View style={styles.v2ImgWrap}>
          <Image
            source={menu.image ? { uri: menu.image } : require('@/assets/images/riz_Spaghettis et Œuf_poulet_pané_fritz_platain_noBG.png')}
            style={styles.v2Image}
          />
        </View>

        {/* Contenu */}
        <View style={styles.v2Content}>
          <View style={styles.v2TitleRow}>
            <Text style={styles.v2Name} numberOfLines={1}>{menu.titre}</Text>
            {/* <View style={styles.v2CartBtn}>
              <Ionicons name="cart-outline" size={14} color="white" />
            </View> */}
          </View>

          <View style={styles.v2BottomRow}>
            <Text style={styles.v2Price}>{price}</Text>
            <View style={styles.v2LivraisonChip2}>
              <View style={styles.v2LivraisonIcon}>
                               <Text style={styles.v2LivraisonChip1Label}>12h</Text>

              </View>
              <View>
                <Text style={styles.v2LivraisonChip2Label}>Prochaine </Text>
                <Text style={styles.v2LivraisonChip2Time}>livraison</Text>
              </View>
            </View>
          </View>
        </View>

      </TouchableOpacity>
    );
  }

  // --- DESIGN 3: POPULAR MENU (Ex-D2) ---
  if (variant === 3) {
    return (
      <TouchableOpacity style={styles.v3Card} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.v3DeliveryWhite}>
          {/* <View style={{ flexShrink: 1 }}>
            <Text style={[styles.v2DeliveryMeta, { color: '#111' }]}>
              <Text style={{ color: '#e8440a', fontSize: 13, fontWeight: '800' }}>40</Text>
              <Text style={{ color: '#111', fontSize: 13, fontWeight: '800' }}>/100</Text>
            </Text>
            <Text style={[styles.v2DeliveryMain, { color: '#111' }]}>Disponible</Text>
          </View> */}
        
         <View style={styles.v2LivraisonChip2}>
              <View style={styles.v2LivraisonIcon}>
                               <Text style={styles.v2LivraisonChip1Label}>12h</Text>

              </View>
              <View>
                <Text style={styles.v2LivraisonChip2Label}>Prochaine </Text>
                <Text style={styles.v2LivraisonChip2Time}>livraison</Text>
              </View>
            </View>
        </View>
        <View style={styles.v3ImgBox}>
            <Image
                source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground.webp')}
                style={styles.v3Image}
                contentFit="contain"
            />
        </View>
        <Text style={styles.v3Price}>{price}</Text>
        <Text style={styles.v3Desc} numberOfLines={1}>{menu.titre}</Text>
        {/* <Text style={styles.v3Livraison} numberOfLines={1}>livraison 12h</Text> */}
          <View style={styles.v2DispoBadgeDesign3} >
            <View style={styles.v2DispoPulse} />
            <Text style={styles.v2DispoText}>
              <Text style={{ color: '#4faa71ff', fontWeight: '900' }}>40</Text>
              <Text style={{ color: '#666' }}> En Stock</Text>
            </Text>
          </View>
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

    const stock = 40;
    const total = 100;
    const stockPercent = (stock / total) * 100;

    return (
      <TouchableOpacity style={[styles.v4Card, { backgroundColor: bgColor }]} onPress={onPress} activeOpacity={0.9}>
        {/* Tag livraison flottant en haut à droite */}
        <View style={styles.v4LivraisonTag}>
          <View style={styles.v4LivraisonDot} />
          <Text style={styles.v4LivraisonText}>12h</Text>
          <Ionicons name="bicycle-outline" size={11} color="#e8440a" />
        </View>

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

        {/* Barre de stock en bas */}
        <BlurView intensity={60} tint="light" style={styles.v4StockBar}>
          <View style={styles.v4StockInfo}>
            <View style={styles.v4StockLeft}>
              <View style={styles.v4StockPulse} />
              <Text style={styles.v4StockCount}>
                <Text style={{ color: '#e8440a', fontWeight: '900' }}>{stock}</Text>
                <Text style={{ color: '#000000ff' }}> / {total}</Text>
              </Text>
            </View>
            <Text style={styles.v4StockLabel}>en stock</Text>
          </View>
          <View style={styles.v4ProgressTrack}>
            <View style={[styles.v4ProgressFill, { width: `${stockPercent}%` }]} />
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 5: GLASS SHOWCASE ---
  if (variant === 5) {
    const V5_ACCENTS = ['#e8440a', '#6c5ce7', '#00b894', '#fd79a8', '#0984e3', '#e17055'];
    const accent = V5_ACCENTS[index % V5_ACCENTS.length];
    const stock = 40;
    const stockRadius = 18;
    const stockCircumference = 2 * Math.PI * stockRadius;
    const stockProgress = stockCircumference - (stock / 100) * stockCircumference;

    return (
      <TouchableOpacity style={styles.v5Card} onPress={onPress} activeOpacity={0.92}>
        {/* Fond dégradé subtil */}
        <LinearGradient
          colors={['#fafafa', '#f0f0f0', '#e8e8e8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Cercle décoratif accent en arrière-plan */}
        <View style={[styles.v5DecorCircle, { backgroundColor: accent, opacity: 0.08 }]} />
        <View style={[styles.v5DecorCircle2, { borderColor: accent, opacity: 0.12 }]} />

        {/* Top row: stock ring + prix */}
        <View style={styles.v5TopRow}>
          {/* SVG stock ring */}
          <View style={styles.v5StockRing}>
            <Svg width={44} height={44}>
              <Circle cx={22} cy={22} r={stockRadius} stroke="rgba(0,0,0,0.06)" strokeWidth={3} fill="none" />
              <Circle cx={22} cy={22} r={stockRadius} stroke={accent} strokeWidth={3} fill="none"
                strokeDasharray={`${stockCircumference}`} strokeDashoffset={stockProgress}
                strokeLinecap="round" transform="rotate(-90 22 22)" />
              <SvgText x={22} y={20} textAnchor="middle" fontSize={11} fontWeight="900" fill="#111">{stock}</SvgText>
              <SvgText x={22} y={28} textAnchor="middle" fontSize={5} fontWeight="600" fill="#999">DISPO</SvgText>
            </Svg>
          </View>

          {/* Prix avec accent */}
          <View style={[styles.v5PriceChip, { backgroundColor: accent }]}>
            <Text style={styles.v5PriceText}>{price}</Text>
          </View>
        </View>

        {/* Image produit — flottante, débordante, dramatique */}
        <View style={styles.v5ImgZone}>
          <View style={[styles.v5ImgShadow, { shadowColor: accent }]}>
            <Image
              source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground1.webp')}
              style={styles.v5ProductImg}
              contentFit="contain"
            />
          </View>
        </View>

        {/* Titre — minimaliste, fort */}
        <Text style={styles.v5Title} numberOfLines={1}>{menu.titre}</Text>

        {/* Livraison — bande glass en bas */}
        <View style={styles.v5DeliveryStrip}>
          <View style={[styles.v5DeliveryIcon, { backgroundColor: accent }]}>
            <Ionicons name="flash" size={10} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.v5DeliveryLabel}>PROCHAINE LIVRAISON</Text>
            <Text style={[styles.v5DeliveryTime, { color: accent }]}>Aujourd'hui · 12h</Text>
          </View>
          <View style={styles.v5DeliveryPulse} />
        </View>

        {/* Bouton + flottant */}
        <View style={[styles.v5AddBtn, { backgroundColor: accent }]}>
          <Ionicons name="add" size={18} color="white" />
        </View>
      </TouchableOpacity>
    );
  }

  // --- DESIGN 6: PANORAMIC SPLIT ---
  if (variant === 6) {
    const V6_BG = ['#fef4f0', '#f0f4fe', '#f0fef4', '#fef0fa', '#f4f0fe', '#fefaf0'];
    const V6_ACCENT = ['#e8440a', '#0984e3', '#00b894', '#e84393', '#6c5ce7', '#e17055'];
    const bg = V6_BG[index % V6_BG.length];
    const accent = V6_ACCENT[index % V6_ACCENT.length];
    const stock = 40;
    const stockRadius = 14;
    const stockCircumference = 2 * Math.PI * stockRadius;
    const stockProgress = stockCircumference - (stock / 100) * stockCircumference;

    return (
      <TouchableOpacity style={[styles.v6Card, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.9}>
        {/* Grand cercle décoratif flou */}
        <View style={[styles.v6Blob, { backgroundColor: accent }]} />
        <View style={[styles.v6Blob2, { backgroundColor: accent }]} />

        {/* Layout horizontal: gauche infos, droite image */}
        <View style={styles.v6Split}>
          {/* Colonne gauche — tout le contenu texte */}
          <View style={styles.v6Left}>
            {/* Prix pill */}
            <View style={[styles.v6PricePill, { backgroundColor: accent }]}>
              <Text style={styles.v6PriceText}>{price}</Text>
            </View>

            {/* Titre */}
            <Text style={styles.v6Title} numberOfLines={2}>{menu.titre}</Text>

            {/* Stock mini inline */}
            <View style={styles.v6StockRow}>
              <Svg width={32} height={32}>
                <Circle cx={16} cy={16} r={stockRadius} stroke="rgba(0,0,0,0.06)" strokeWidth={2} fill="none" />
                <Circle cx={16} cy={16} r={stockRadius} stroke="#4ade80" strokeWidth={2} fill="none"
                  strokeDasharray={`${stockCircumference}`} strokeDashoffset={stockProgress}
                  strokeLinecap="round" transform="rotate(-90 16 16)" />
                <SvgText x={16} y={18} textAnchor="middle" fontSize={9} fontWeight="900" fill="#111">{stock}</SvgText>
              </Svg>
              <Text style={styles.v6StockText}>en stock</Text>
            </View>

            {/* Livraison badge */}
            <View style={styles.v6DeliveryBadge}>
              <View style={[styles.v6DeliveryDot, { backgroundColor: accent }]} />
              <View>
                <Text style={styles.v6DeliveryMeta}>PROCHAINE LIVRAISON</Text>
                <Text style={[styles.v6DeliveryHour, { color: accent }]}>Aujourd'hui · 12h</Text>
              </View>
            </View>
          </View>

          {/* Colonne droite — image dramatique */}
          <View style={styles.v6Right}>
            <View style={[styles.v6ImgGlow, { shadowColor: accent }]}>
              <Image
                source={menu.image ? { uri: menu.image } : require('@/assets/images/burger1-nobackground1.webp')}
                style={styles.v6Img}
                contentFit="contain"
              />
            </View>
          </View>
        </View>

        {/* Bouton + en bas à droite */}
        <View style={[styles.v6AddBtn, { backgroundColor: accent }]}>
          <Ionicons name="arrow-forward" size={16} color="white" />
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
    v1Val: { color: 'white', fontSize: 12, fontWeight: '900', paddingHorizontal: 0, paddingVertical: 2 },
    v1ImgWrapper: { flex: 1, marginTop: 0, alignItems: 'center' },
    v1Image: { width: '100%', height: '100%', transform: [{ scale: 1.6 }, { rotate: '-10deg' }] },
    v1BrandBar: { borderRadius: 20, padding: 0, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 10, overflow: 'hidden' },
    v1BrandIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f96f62', alignItems: 'center', justifyContent: 'center' },
    v1BrandInitial: { color: 'white', fontWeight: '800', fontSize: 14 },
    v1BrandName: { color: 'white', fontSize: 15, fontWeight: '600', marginLeft: 8, marginRight: 8 },
    v1BadgeTime: { backgroundColor: '#e8440a',position: 'absolute', top: 50, right: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4,overflow: 'hidden' },
    v1BadgeCal: { position: 'absolute', top: 110, left: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,overflow: 'hidden' },
    v1BadgeTextDetail: { color: 'white', fontSize: 11, fontWeight: '500' },

 
    // --- DESIGN 1 Delivery ---
    v2Delivery: { flexDirection: 'row', alignItems: 'center', marginTop: 0, backgroundColor: '#2d6e65', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 10, gap: 8, alignSelf: 'flex-start' },
    v2DeliveryWhite: { flexDirection: 'row', alignItems: 'center', marginTop: 0, backgroundColor: 'white',  paddingVertical: 7, paddingHorizontal: 10, gap: 8, alignSelf: 'flex-start',  },
    v2DeliveryTimer: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center' },
    v2DeliveryHour: { fontSize: 16, fontWeight: '900', color: 'white', lineHeight: 18 },
    v2DeliveryUnit: { fontSize: 7, color: 'rgba(255,255,255,0.7)' },
    v2DeliveryMeta: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
    v2DeliveryMain: { fontSize: 10, fontWeight: '700', color: 'white' },
    v2DeliveryDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 4 },

    // --- DESIGN 2 (Ex-D4) ---
    v2Card: { width: 220, backgroundColor: 'white', borderRadius: 22, padding: 14, marginRight: 16, borderWidth: 1, borderColor: '#efefef' },
    v2ImgWrap: { width: '100%', height: 140, borderRadius: 16, overflow: 'hidden' },
    v2Image: { width: 130, height: 130,marginLeft:-3 },
    // v2Rating: { position: 'absolute', top: 18, right: 18, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    v2Rating: { position: 'absolute', top: 18, right: 0, backgroundColor: 'rgba(255,255,255,0)', paddingHorizontal: 0, paddingVertical: 0, borderRadius: 12 },
    v2RatingText: { fontSize: 10, fontWeight: '700', color: '#222' },
    v2Name: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: 10 },
    v2Desc: { fontSize: 10, color: '#aaa', marginVertical: 4 },
    v2Footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    v2Price: { fontSize: 15, fontWeight: '800', color: '#111' },
    v2CartBtn: { width: 30, height: 30, backgroundColor: '#2d6e65', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    v2DispoBadge: {zIndex:10, position: 'absolute', top: 4, left: 6, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
    v2DispoBadgeDesign3: {zIndex:10, position: 'relative', top: 0, left: 0, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
    v2DispoPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 },
    v2DispoText: { fontSize: 11, fontWeight: '700' },
    v2LivraisonChip: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
    v2LivraisonChipText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    v2LivraisonChip2: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff5f0', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
    v2LivraisonChip2Text: { fontSize: 10, fontWeight: '700', color: '#e8440a' },
    v2LivraisonIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#e8440a', alignItems: 'center', justifyContent: 'center' },
    v2LivraisonChip2Label: { fontSize: 8, fontWeight: '800', color: '#000000ff', textTransform: 'uppercase', letterSpacing: 0.5 },
     v2LivraisonChip1Label: { fontSize: 10, fontWeight: '600', color: '#ffffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
    v2LivraisonChip2Time: { fontSize: 10, fontWeight: '800', color: '#e8440a' },
    v2Content: { marginTop: 10 },
    v2TitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    v2BottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    v2MiniProgress: { alignItems: 'flex-end', gap: 2 },
    v2MiniProgressTrack: { width: 40, height: 3, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' },
    v2MiniProgressFill: { height: '100%', backgroundColor: '#e8440a', borderRadius: 2 },
    v2MiniProgressLabel: { fontSize: 7, fontWeight: '600', color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5 },

    // --- DESIGN 3 (Ex-D2) ---
    v3Card: { width: 120, backgroundColor: 'white', borderRadius: 20, padding: 14,paddingTop:10,paddingBottom:5, marginRight: 16, borderWidth: 1, borderColor: '#efefef', alignItems: 'center' },
    v3DeliveryWhite: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingVertical: 0, paddingHorizontal: 8,   marginBottom: 0 },
    v3Livraison: { color: '#e8440a', fontSize: 12, fontWeight: '700', marginTop: 4 },
    v3ImgBox: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center' },
    v3Image: { width: '110%', height: '110%' },
    v3Price: { fontSize: 16, fontWeight: '800', color: '#111', marginTop: 4, textAlign: 'center' },
    v3Desc: { fontSize: 12, color: '#000000ff', marginTop: 2, textAlign: 'center' },

    // --- DESIGN 4 (Ex-D5) ---
    v4Card: { width: 240, height: 320, borderRadius: 28, marginRight: 16, overflow: 'hidden' },
    v4Text: { padding: 24, zIndex: 2 },
    v4Title: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', lineHeight: 26 },
    v4Price: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
    v4ImgWrap: { position: 'absolute', bottom: -20, right: -40, width: 220, height: 220, zIndex: 1 },
    v4Image: { width: '110%', height: '110%', borderRadius: 110 },
    v4LivraisonTag: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, zIndex: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    v4LivraisonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
    v4LivraisonText: { fontSize: 11, fontWeight: '800', color: '#e8440a' },
    v4StockBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 10, zIndex: 5, overflow: 'hidden' },
    v4StockInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    v4StockLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    v4StockPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 },
    v4StockCount: { fontSize: 13, fontWeight: '700' },
    v4StockLabel: { fontSize: 10, fontWeight: '600', color: '#000000ff', textTransform: 'uppercase', letterSpacing: 1 },
    v4ProgressTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' },
    v4ProgressFill: { height: '100%', backgroundColor: '#e8440a', borderRadius: 2 },

    // --- DESIGN 5: GLASS SHOWCASE ---
    v5Card: { width: 200, height: 280, borderRadius: 28, marginRight: 16, overflow: 'hidden', padding: 14 },
    v5DecorCircle: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70 },
    v5DecorCircle2: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, borderWidth: 2 },
    v5TopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
    v5StockRing: { width: 44, height: 44 },
    v5PriceChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
    v5PriceText: { color: 'white', fontSize: 13, fontWeight: '900' },
    v5ImgZone: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2, marginVertical: 4 },
    v5ImgShadow: { width: 120, height: 120, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    v5ProductImg: { width: '100%', height: '100%', transform: [{ scale: 1.3 }, { rotate: '-8deg' }] },
    v5Title: { fontSize: 14, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 8, zIndex: 2 },
    v5DeliveryStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10, zIndex: 2 },
    v5DeliveryIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    v5DeliveryLabel: { fontSize: 6, fontWeight: '700', color: '#999', letterSpacing: 0.8 },
    v5DeliveryTime: { fontSize: 10, fontWeight: '800' },
    v5DeliveryPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 },
    v5AddBtn: { position: 'absolute', bottom: 14, right: 14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    // --- DESIGN 6: PANORAMIC SPLIT ---
    v6Card: { width: SCREEN_WIDTH * 0.78, height: 200, borderRadius: 26, marginRight: 16, overflow: 'hidden', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
    v6Blob: { position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: 80, opacity: 0.07 },
    v6Blob2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, opacity: 0.05 },
    v6Split: { flex: 1, flexDirection: 'row', gap: 12 },
    v6Left: { flex: 1, justifyContent: 'space-between', zIndex: 2 },
    v6PricePill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    v6PriceText: { color: 'white', fontSize: 13, fontWeight: '900' },
    v6Title: { fontSize: 16, fontWeight: '900', color: '#111', lineHeight: 20, marginTop: 6 },
    v6StockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    v6StockText: { fontSize: 9, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
    v6DeliveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 8 },
    v6DeliveryDot: { width: 6, height: 6, borderRadius: 3 },
    v6DeliveryMeta: { fontSize: 6, fontWeight: '700', color: '#aaa', letterSpacing: 0.8 },
    v6DeliveryHour: { fontSize: 10, fontWeight: '800' },
    v6Right: { width: 140, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    v6ImgGlow: { width: 140, height: 140, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
    v6Img: { width: '100%', height: '100%', transform: [{ scale: 1.25 }, { rotate: '-10deg' }] },
    v6AddBtn: { position: 'absolute', bottom: 14, right: 14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    defaultContainer: { padding: 20, backgroundColor: 'white', marginRight: 16, borderRadius: 10 }
});
