import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, Platform, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Loader } from '../../../components/Loader';
import * as Location from 'expo-location';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const SHEET_HEIGHT = 384;

interface CheckoutLocationOverlayProps {
  onClose: () => void;
  address: string;
  note: string;
  onSave?: (address: string, note: string) => void;
}

export const CheckoutLocationOverlay: React.FC<CheckoutLocationOverlayProps> = ({ onClose, address, note, onSave }) => {
  const [localAddress, setLocalAddress] = React.useState(address);
  const [localNote, setLocalNote] = React.useState(note);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: event.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Auto-refresh location if current address looks like GPS coords
  React.useEffect(() => {
    if (address && /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(address)) {
      handleGetLocation();
    }
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.spring(keyboardHeight, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start(() => {
      onClose();
    });
  };

  const handleGetLocation = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setIsLocating(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const coords = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      setLocalAddress(coords);
    } catch (error) {
      alert('Error fetching location or timeout. Using last known if available.');
      // Try a less accurate but faster fix as fallback
      try {
        const last = await Location.getLastKnownPositionAsync({});
        if (last) {
           const coords = `${last.coords.latitude.toFixed(6)}, ${last.coords.longitude.toFixed(6)}`;
           setLocalAddress(coords);
        }
      } catch (e) {}
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    setIsSaving(true);
    if (onSave) onSave(localAddress, localNote);
    
    // Wait for the animation to progress/finish before closing the overlay
    setTimeout(() => {
      handleClose();
    }, 400); // 400ms is standard
  };

  return (
    <View style={styles.keyboardWrapper}>
      <AnimatedBlurView 
        intensity={40} 
        tint="light" 
        style={[
          styles.blurOverlay,
          { 
            height: keyboardHeight.interpolate({
              inputRange: [0, 700],
              outputRange: [SHEET_HEIGHT, SHEET_HEIGHT + 1000]
            })
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: keyboardHeight.interpolate({
            inputRange: [0, 100],
            outputRange: [0, -95]
          }) }] }
        ]}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="location-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.keyboardSmallBtn}>
                <Ionicons name="chevron-down-outline" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{localAddress || '(Send Live GPS Location)'}</Text>
                <TextInput 
                  style={styles.textInput}
                  placeholder="Note (ex: Porte bleue, 2ème étage...)"
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  value={localNote}
                  onChangeText={setLocalNote}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={Keyboard.dismiss}
                />
                
                {isLocating && (
                  <BlurView intensity={30} tint="light" style={styles.locatingOverlay}>
                    <Loader size={40} color="#ec4913" />
                    <Text style={styles.locatingText}>Récupération de votre position actuelle...</Text>
                  </BlurView>
                )}
            </View>

            <TouchableOpacity 
              style={styles.gpsBtn}
              onPress={handleGetLocation}
            >
              <Ionicons name="locate-outline" size={18} color="#334155" />
              <Text style={styles.gpsBtnText}>Send Live GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checkBtn} 
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader size={34} color="white" />
              ) : (
                <Ionicons name={isKeyboardVisible ? "chevron-down" : "checkmark"} size={22} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  blurOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  keyboardSmallBtn: {
    marginLeft: 8,
    padding: 4,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inputContainer: {
    position: 'relative',
    height: 240,
  },
  addressBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 20,
  },
  addressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    padding: 0,
  },
  gpsBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  checkBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: '#ec4913',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  locatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
    overflow: 'hidden',
  },
  locatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ec4913',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
