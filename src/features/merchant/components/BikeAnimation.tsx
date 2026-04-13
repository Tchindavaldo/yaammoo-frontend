import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Platform } from 'react-native';
import Svg, { G, Circle, Rect, Path, Line } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Version universelle (Web + Native) avec positionnement corrigé.
 */

export const BikeAnimation: React.FC = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current; 
  const bobAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation infinie (0 à 360)
    const runRotation = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, {
        toValue: 360,
        duration: 500,
        useNativeDriver: false, // SVG props don't support native driver on all devices
      }).start(() => runRotation());
    };
    runRotation();

    // Bobbing
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -2,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Road scrolling
    Animated.loop(
      Animated.timing(roadAnim, {
        toValue: -20,
        duration: 450,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const renderWheel = (x: number, y: number) => (
    <G x={x} y={y}>
      <AnimatedG rotation={rotateAnim} origin="0, 0">
        <Circle r="7" stroke="#3B6D11" strokeWidth="2" fill="none" />
        <Line x1="0" y1="-7" x2="0" y2="7" stroke="#3B6D11" strokeWidth="1.1" />
        <Line x1="-7" y1="0" x2="7" y2="0" stroke="#3B6D11" strokeWidth="1.1" />
        <Line x1="-5" y1="-5" x2="5" y2="5" stroke="#3B6D11" strokeWidth="1.1" />
        <Line x1="5" y1="-5" x2="-5" y2="5" stroke="#3B6D11" strokeWidth="1.1" />
      </AnimatedG>
    </G>
  );

  return (
    <View style={styles.container}>
      <View style={styles.scene}>
        {/* ROAD */}
        <Animated.View style={[styles.roadStrip, { transform: [{ translateX: roadAnim }] }]}>
          {[...Array(15)].map((_, i) => (
            <View key={i} style={styles.roadDash} />
          ))}
        </Animated.View>

        {/* BIKE */}
        <Animated.View style={[styles.bikeWrap, { transform: [{ translateY: bobAnim }] }]}>
          <Svg width="62" height="28" viewBox="0 0 62 30" fill="none">
            {renderWheel(9, 22)}
            {renderWheel(51, 22)}
            
            {/* BODY */}
            <Rect x="1" y="12" width="20" height="11" rx="2" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1.5" />
            <Line x1="1" y1="18" x2="21" y2="18" stroke="#3B6D11" strokeWidth="1" strokeDasharray="2 2" />
            <Path d="M21 15 L33 15 L33 7 L41 7 L51 15" stroke="#3B6D11" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M27 15 L33 7" stroke="#3B6D11" strokeWidth="1.4" strokeLinecap="round" />
            <Path d="M51 15 L53 22" stroke="#3B6D11" strokeWidth="1.6" strokeLinecap="round" />
            <Path d="M33 7 L33 3" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="30" y1="3" x2="36" y2="3" stroke="#3B6D11" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="33" y1="7" x2="28" y2="7" stroke="#3B6D11" strokeWidth="2.5" strokeLinecap="round" />
            <Circle cx="33" cy="15" r="2" fill="#3B6D11" />
          </Svg>
        </Animated.View>
      </View>
      <Text style={styles.label}>En route...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 68,
    alignItems: 'center',
    gap: 2,
  },
  scene: {
    width: 66,
    height: 36,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 4,
  },
  bikeWrap: {
    position: 'absolute',
    bottom: 4,
    left: 2,
  },
  roadStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 300,
    height: 5,
    flexDirection: 'row',
  },
  roadDash: {
    width: 10,
    height: 5,
    backgroundColor: '#3B6D11',
    opacity: 0.25,
    marginRight: 10,
  },
  label: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#27500A',
    textAlign: 'center',
    marginTop: 2,
  },
});
