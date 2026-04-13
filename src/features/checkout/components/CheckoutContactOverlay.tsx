import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, Platform, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Loader } from '../../../components/Loader';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const SHEET_HEIGHT = 384;

interface CheckoutContactOverlayProps {
  onClose: () => void;
  phone: string;
  onSelectPhone?: (phone: string) => void;
}

export const CheckoutContactOverlay: React.FC<CheckoutContactOverlayProps> = ({ onClose, phone, onSelectPhone }) => {
  const [localPhone, setLocalPhone] = React.useState(phone);
  const [isSaving, setIsSaving] = React.useState(false);
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

  const handleSave = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    setIsSaving(true);
    if (onSelectPhone) onSelectPhone(localPhone);
    
    // Wait for the animation to progress/finish before closing the overlay
    setTimeout(() => {
      handleClose();
    }, 400); // 400ms is standard for keyboard animation
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
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Contact Number</Text>
              <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.keyboardSmallBtn}>
                <Ionicons name="chevron-down-outline" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={styles.textInput}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                  value={localPhone}
                  onChangeText={setLocalPhone}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.checkBtn} 
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader size={34} color="white" />
                ) : (
                  <Ionicons name={isKeyboardVisible ? "chevron-down" : "checkmark"} size={28} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Our courier will use this number to contact you upon arrival if there are any issues with your delivery.
            </Text>
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
    height: 240,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    height: 60,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1e293b',
    padding: 0,
  },
  checkBtn: {
    width: 60,
    height: 60,
    backgroundColor: '#ec4913',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  helperText: {
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
