import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/src/theme';

const { width } = Dimensions.get('window');

export const HeroBanner: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.bannerWrapper}>
                <Image 
                    source={require('@/assets/images/banner shawamar.png')} 
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
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Theme.spacing.md,
        width: '100%',
        marginVertical: 10,
    },
    bannerWrapper: {
        width: '100%',
        height: 210,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#e8440a', // Fallback color (orange typical of hunger apps)
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
    }
});
