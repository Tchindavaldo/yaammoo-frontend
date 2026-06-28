import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import MapComponent from '@/src/components/MapComponent';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { DeliveryUser } from './MerchantOrderBottomSheet';

// ─── InfoCard ──────────────────────────────────────────────────────────────────
export function InfoCard({
  label, value, small, compact, renderValue,
}: {
  label: string; value: string; small?: boolean; compact?: boolean;
  renderValue?: () => React.ReactNode;
}) {
  return (
    <View style={[styles.infoCard, compact && { padding: 10 }]}>
      <Text style={[styles.infoLabel, compact && { marginBottom: 2, fontSize: 9 }]}>
        {label}
      </Text>
      {renderValue ? renderValue() : (
        <Text style={[small ? styles.infoValSm : styles.infoVal, compact && { fontSize: 13, lineHeight: 18 }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

// ─── Waveform ──────────────────────────────────────────────────────────────────
function Waveform({ active, progress = 0 }: { active?: boolean; progress?: number }) {
  const heights = [4,7,12,6,10,14,8,5,11,9,13,6,8,12,5,10,7,14,6,9,11,4,8,12,7,5,10,13,6,9];
  return (
    <View style={styles.wave}>
      {heights.map((h, i) => {
        const barProgress = (i + 1) / heights.length;
        const isPlayed = progress >= barProgress;
        return (
          <View
            key={i}
            style={[
              styles.wavebar,
              { height: h },
              (active && isPlayed) && { backgroundColor: '#ec4913' },
              (active && !isPlayed) && { backgroundColor: 'rgba(236,19,49,0.2)' },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── LivraisonTab ──────────────────────────────────────────────────────────────
export function LivraisonTab({ user }: { user: DeliveryUser }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);
  const [region, setRegion] = useState<any>(null);

  const parseLocation = (addr: string) => {
    if (!addr || typeof addr !== 'string') return null;
    if (!/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(addr)) return null;
    const parts = addr.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { latitude: parts[0], longitude: parts[1] };
    }
    return null;
  };

  const coords = React.useMemo(() => parseLocation(user.addr), [user.addr]);

  useEffect(() => {
    if (coords) {
      setRegion({ ...coords, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    } else {
      setRegion(null);
    }
  }, [coords]);

  const openInMaps = () => {
    if (!coords) return;
    setIsOpeningMaps(true);
    const { latitude, longitude } = coords;
    const label = encodeURIComponent(user.name);
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&label=${label}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    Linking.canOpenURL(url!).then(supported => {
      const finalUrl = supported ? url! : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(finalUrl).finally(() => { setTimeout(() => setIsOpeningMaps(false), 2000); });
    });
  };

  async function playSound() {
    if (!user.voiceNoteUri) return;
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync(); setIsPlaying(false);
        } else {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis >= (status.durationMillis || 0)) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync(); setIsPlaying(true);
        }
        return;
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: user.voiceNoteUri }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.durationMillis) setPlaybackProgress(status.positionMillis / status.durationMillis);
          if (status.didJustFinish) { setIsPlaying(false); setPlaybackProgress(0); }
        }
      });
    } catch (e) { console.log('Error playing sound', e); }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, height: 110 }}>
        <View style={{ width: '42%', gap: 8 }}>
          <View style={{ flex: 1 }}><InfoCard label="Créneau" value={user.creneau} compact /></View>
          <View style={{ flex: 1 }}><InfoCard label="Téléphone" value={user.phone} small compact /></View>
        </View>
        <View style={{ flex: 1, height: 110 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openInMaps}
            style={[styles.mapPlaceholder, { overflow: 'hidden', borderRadius: 12, flex: 1 }]}
            disabled={!coords}
          >
            <MapComponent
              region={region}
              coords={coords}
              address={user.addr}
              deliveryType={
                user.creneau === 'Sur place' ? 'surplace'
                  : user.creneau.includes('Express') ? 'express'
                  : 'time'
              }
            />
            {isOpeningMaps && (
              <View style={styles.mapLoadingOverlay}>
                <View style={styles.mapLoaderCircle}>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </View>
                <Text style={styles.mapLoadingText}>Ouverture Maps...</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.infoCard, { marginTop: 12, padding: 12 }]}>
        <Text style={styles.infoLabel}>Note de livraison</Text>
        <Text style={styles.infoValSm}>{user.note}</Text>
      </View>

      {user.voiceNoteUri ? (
        <>
          <Text style={[styles.infoLabel, { marginTop: 14, marginBottom: 8 }]}>Message vocal</Text>
          <TouchableOpacity style={styles.voiceBar} activeOpacity={0.7} onPress={playSound}>
            <View style={styles.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#ec4913" />
            </View>
            <Waveform active={isPlaying} progress={playbackProgress} />
            <Text style={styles.waveDur}>
              {isPlaying ? `${Math.round(playbackProgress * 100)}%` : '0:18'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.infoCard, { marginTop: 12, padding: 12, opacity: 0.5 }]}>
          <Text style={styles.infoLabel}>Message vocal</Text>
          <Text style={styles.infoValSm}>Aucun message vocal</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '700', marginBottom: 6,
  },
  infoVal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoValSm: { fontSize: 13, color: '#374151', lineHeight: 20 },
  mapPlaceholder: {
    backgroundColor: '#F3F4F6', borderRadius: 20, marginBottom: 8,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  mapLoaderCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  mapLoadingText: { fontSize: 10, fontWeight: '700', color: '#ec4913', textTransform: 'uppercase' },
  voiceBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  playBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  wavebar: { width: 3, borderRadius: 2, backgroundColor: '#E5E7EB' },
  waveDur: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
});
