import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, Platform, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Loader } from '../../../components/Loader';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const SHEET_HEIGHT = 384;

interface CheckoutPaymentOverlayProps {
  onClose: () => void;
  phone: string;
  onConfirm: (phone: string) => Promise<void>;
  totalAmount: number;
}

export const CheckoutPaymentOverlay: React.FC<CheckoutPaymentOverlayProps> = ({ onClose, phone, onConfirm, totalAmount }) => {
  const [localPhone, setLocalPhone] = React.useState(phone);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(300)).current; // Entry/Exit animation

  React.useEffect(() => {
    // Entry animation - Use false to be safe and consistent with height animations
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false, 
      tension: 65, // Faster entry
      friction: 10,
    }).start();

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: event.endCoordinates.height,
          useNativeDriver: false, // MUST be false because height is animated
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
    // Slide down before closing
    // Faster timing for closing to avoid blocking UI
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  const handleAction = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      handleClose();
    }
  };

  const handlePay = async () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      try {
        setIsProcessing(true);
        await onConfirm(localPhone);
        handleClose();
      } catch (error) {
        console.error("Payment confirmation error:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Animated.View 
      style={[
        styles.keyboardWrapper,
        {
          top: keyboardHeight.interpolate({
            inputRange: [0, 50],
            outputRange: ['99%', '0%'],
            extrapolate: 'clamp'
          })
        }
      ]}
    >
      <AnimatedBlurView 
        intensity={keyboardHeight.interpolate({
          inputRange: [0, 100],
          outputRange: [0, 90],
          extrapolate: 'clamp'
        })} 
        tint="dark" 
        style={[
          styles.blurOverlay,
          { 
            height: keyboardHeight.interpolate({
              inputRange: [0, 100],
              outputRange: [0, SHEET_HEIGHT],
              extrapolate: 'clamp'
            })
          }
        ]} 
      />
      
      <Animated.View 
        style={[
          styles.container,
          { 
            transform: [
              { translateY: slideAnim },
              { translateY: keyboardHeight.interpolate({
                inputRange: [0, 100],
                outputRange: [0, -100]
              })}
            ] 
          }
        ]}
      >
        <View style={styles.payFooterCapsule}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={styles.actionRow}>
           
             
             {!isKeyboardVisible && (

            <TouchableOpacity 
              style={styles.closeCircle} 
              onPress={handleAction}
            >
               <Ionicons 
                 name={isKeyboardVisible ? "chevron-down" : "close"} 
                 size={isKeyboardVisible ? 18 : 16} 
                 color="white" 
               />
            </TouchableOpacity>
             )}
          </View>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={16} color="white" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Phone Number"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="phone-pad"
              value={localPhone}
              onChangeText={setLocalPhone}
              onFocus={() => setIsKeyboardVisible(true)}
            />
          </View>

          <View style={styles.actionRow}>
            
           
              <TouchableOpacity 
                style={[styles.payerBtn, isProcessing && styles.payerBtnDisabled]} 
                onPress={handlePay}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader size={20} color="white" />
                ) : (
                  <>
                    {/* <Text style={styles.payerBtnText}>PAYER</Text> */}
                    <Ionicons  name={isKeyboardVisible ? "chevron-down" : "arrow-forward-outline"} size={14} color="white" style={{ marginLeft: 0 }} />
                  </>
                )}
              </TouchableOpacity>
           
          </View>
        </View>
      </Animated.View>
    </Animated.View>
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
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 2,
  },
  payFooterCapsule: {
    width: "100%",
    height: 70,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 45,
    borderRadius: 22.5,
    paddingHorizontal: 12,
    marginHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4913",
    // paddingHorizontal: 20,
    height: 40,
    borderRadius: 145,
    justifyContent: 'center',
    minWidth: 40,
  },
  payerBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  payerBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
