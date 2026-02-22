import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '@/src/theme';
import { Menu } from '@/src/types';
import axios from 'axios';
import { Config } from '@/src/api/config';

type Step = 'image' | 'name' | 'price' | 'desc1' | 'desc2' | 'status';

interface AddMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (menu: any) => Promise<void>;
  loading?: boolean;
  existingMenu?: any; // pour la modification
}

const STEPS: Step[] = ['image', 'name', 'price', 'desc1', 'desc2', 'status'];

export const AddMenuSheetMultiStep: React.FC<AddMenuSheetProps> = ({
  visible,
  onClose,
  onSave,
  loading: externalLoading,
  existingMenu,
}) => {
  const [step, setStep] = useState<Step>('image');
  const [images, setImages] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [nom, setNom] = useState(existingMenu?.name || '');
  const [prix1, setPrix1] = useState(existingMenu?.prices?.[0]?.price?.toString() || '');
  const [prix2, setPrix2] = useState(existingMenu?.prices?.[1]?.price?.toString() || '');
  const [prix3, setPrix3] = useState(existingMenu?.prices?.[2]?.price?.toString() || '');
  const [desc1, setDesc1] = useState(existingMenu?.prices?.[0]?.description || '');
  const [desc2, setDesc2] = useState(existingMenu?.prices?.[1]?.description || '');
  const [desc3, setDesc3] = useState(existingMenu?.prices?.[2]?.description || '');
  const [availability, setAvailability] = useState(existingMenu?.status || 'available');
  const [uploadProgress, setUploadProgress] = useState([0, 0, 0]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isModification = !!existingMenu?.id;

  const reset = () => {
    setStep('image');
    setImages([]);
    setUploadedUrls([]);
    setNom('');
    setPrix1(''); setPrix2(''); setPrix3('');
    setDesc1(''); setDesc2(''); setDesc3('');
    setAvailability('available');
    setUploadProgress([0, 0, 0]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à votre galerie.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const newImages = [...images];
      newImages[index] = uri;
      setImages(newImages);

      // Upload image
      await uploadImage(uri, index);
    }
  };

  const uploadImage = async (uri: string, index: number) => {
    try {
      setUploadingIdx(index);
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const type = 'image/jpeg';
      formData.append('image', { uri, name: filename, type } as any);

      const response = await axios.post(`${Config.apiUrl}/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const prog = Math.round((e.loaded / e.total) * 100);
            setUploadProgress((prev) => {
              const next = [...prev];
              next[index] = prog;
              return next;
            });
          }
        },
      });

      const url = response.data?.url || response.data?.data || '';
      const newUrls = [...uploadedUrls];
      newUrls[index] = url;
      setUploadedUrls(newUrls);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', `Impossible d'uploader l'image ${index + 1}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const validate = (): string | null => {
    if (step === 'image' && images.length < 3) return '3 images doivent être sélectionnées';
    if (step === 'name' && !nom.trim()) return 'Le nom ne doit pas être vide';
    if (step === 'price' && !prix1) return 'Le prix 1 ne doit pas être vide';
    if (step === 'desc1' && !desc1.trim()) return 'La description du prix 1 ne doit pas être vide';
    if (step === 'desc2' && prix2 && !desc2.trim()) return 'La description du prix 2 ne doit pas être vide';
    return null;
  };

  const goNext = () => {
    const err = validate();
    if (err) { Alert.alert('Validation', err); return; }

    const currentIdx = STEPS.indexOf(step);

    if (step === 'price') {
      // Si pas de prix2, sauter desc2 et aller en desc1
      setStep('desc1');
      return;
    }

    if (step === 'desc1') {
      if (prix2) setStep('desc2');
      else setStep('status');
      return;
    }

    if (step === 'desc2') {
      setStep('status');
      return;
    }

    if (step === 'status') {
      handleSubmit();
      return;
    }

    const nextStep = STEPS[currentIdx + 1];
    if (nextStep) setStep(nextStep);
  };

  const goBack = () => {
    if (step === 'status') {
      setStep(prix2 ? 'desc2' : 'desc1');
      return;
    }
    if (step === 'desc2') { setStep('desc1'); return; }
    if (step === 'desc1') { setStep('price'); return; }

    const currentIdx = STEPS.indexOf(step);
    if (currentIdx > 0) setStep(STEPS[currentIdx - 1]);
  };

  const handleSubmit = async () => {
    const finalImages = uploadedUrls.length > 0 ? uploadedUrls : images;
    const menuData = {
      name: nom,
      prices: [
        { price: Number(prix1) || 0, description: desc1 },
        { price: Number(prix2) || 0, description: desc2 },
        { price: Number(prix3) || 0, description: desc3 },
      ].filter(p => p.price > 0),
      status: availability,
      images: finalImages.filter(i => i),
      coverImage: finalImages[0] || '',
      // Pour compatibilité avec le type Menu existant
      titre: nom,
      prix1: Number(prix1) || 0,
      prix2: Number(prix2) || 0,
      prix3: Number(prix3) || 0,
      optionPrix1: desc1,
      optionPrix2: desc2,
      optionPrix3: desc3,
      image: finalImages[0] || '',
      disponibilite: availability === 'available' ? 'Disponible' : 'Indisponible',
    };

    try {
      setSubmitting(true);
      await onSave(menuData);
      reset();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le menu');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    image: 'Photos du menu',
    name: 'Nom du menu',
    price: 'Prix du menu',
    desc1: 'Description Prix 1',
    desc2: 'Description Prix 2',
    status: 'Statut et publication',
  };

  const totalSteps = STEPS.length;
  const currentStepIndex = STEPS.indexOf(step);
  const progress = (currentStepIndex + 1) / totalSteps;

  const isLoading = externalLoading || submitting || uploadingIdx !== null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {isModification ? 'Modifier le menu' : 'Nouveau Menu'}
              </Text>
              <Text style={styles.subtitle}>{stepTitles[step]}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Theme.colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Barre de progression */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Étape images */}
            {step === 'image' && (
              <View>
                <Text style={styles.fieldLabel}>
                  Sélectionnez 3 photos de votre plat
                </Text>
                <View style={styles.imageRow}>
                  {[0, 1, 2].map((idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.imageSlot}
                      onPress={() => pickImage(idx)}
                    >
                      {images[idx] ? (
                        <>
                          <Image source={{ uri: images[idx] }} style={styles.imagePreview} />
                          {uploadingIdx === idx && (
                            <View style={styles.uploadOverlay}>
                              <ActivityIndicator color="white" />
                              <Text style={styles.uploadText}>{uploadProgress[idx]}%</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="camera-outline" size={28} color={Theme.colors.gray[400]} />
                          <Text style={styles.imagePlaceholderText}>Photo {idx + 1}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Étape nom */}
            {step === 'name' && (
              <View>
                <Text style={styles.fieldLabel}>Entrez le nom de votre menu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Burger Spécial Maison"
                  value={nom}
                  onChangeText={setNom}
                  autoFocus
                />
              </View>
            )}

            {/* Étape prix */}
            {step === 'price' && (
              <View>
                <Text style={styles.fieldLabel}>Définissez les prix (1 obligatoire)</Text>
                <View style={styles.priceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.priceLabel}>Prix 1 *</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder="2000"
                      keyboardType="numeric"
                      value={prix1}
                      onChangeText={setPrix1}
                      autoFocus
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.priceLabel}>Prix 2</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder="3500"
                      keyboardType="numeric"
                      value={prix2}
                      onChangeText={setPrix2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.priceLabel}>Prix 3</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder="5000"
                      keyboardType="numeric"
                      value={prix3}
                      onChangeText={setPrix3}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Étape desc1 */}
            {step === 'desc1' && (
              <View>
                <Text style={styles.fieldLabel}>Description pour le Prix 1 ({prix1}F)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: Portion petite, idéale pour une personne..."
                  value={desc1}
                  onChangeText={setDesc1}
                  multiline
                  numberOfLines={4}
                  autoFocus
                />
              </View>
            )}

            {/* Étape desc2 */}
            {step === 'desc2' && (
              <View>
                <Text style={styles.fieldLabel}>Description pour le Prix 2 ({prix2}F)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: Portion moyenne, pour deux personnes..."
                  value={desc2}
                  onChangeText={setDesc2}
                  multiline
                  numberOfLines={4}
                  autoFocus
                />
              </View>
            )}

            {/* Étape status */}
            {step === 'status' && (
              <View>
                <Text style={styles.fieldLabel}>Statut de disponibilité</Text>
                <View style={styles.statusRow}>
                  {[
                    { key: 'available', label: 'Disponible', icon: 'checkmark-circle-outline', color: Theme.colors.success },
                    { key: 'unavailable', label: 'Indisponible', icon: 'close-circle-outline', color: Theme.colors.danger },
                  ].map(({ key, label, icon, color }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.statusBtn,
                        availability === key && { borderColor: color, backgroundColor: color + '10' },
                      ]}
                      onPress={() => setAvailability(key)}
                    >
                      <Ionicons
                        name={icon as any}
                        size={24}
                        color={availability === key ? color : Theme.colors.gray[400]}
                      />
                      <Text style={[
                        styles.statusLabel,
                        availability === key && { color },
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryTitle}>📋 Résumé</Text>
                  <Text style={styles.summaryText}>Nom : {nom}</Text>
                  <Text style={styles.summaryText}>Prix 1 : {prix1}F</Text>
                  {prix2 ? <Text style={styles.summaryText}>Prix 2 : {prix2}F</Text> : null}
                  {prix3 ? <Text style={styles.summaryText}>Prix 3 : {prix3}F</Text> : null}
                  <Text style={styles.summaryText}>Photos : {images.length}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer navigation */}
          <View style={styles.footer}>
            {step !== 'image' && (
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <Ionicons name="arrow-back" size={20} color={Theme.colors.gray[600]} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, isLoading && styles.nextBtnDisabled]}
              onPress={goNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.nextBtnText}>
                  {step === 'status' ? (isModification ? 'Modifier' : 'Créer le menu') : 'Suivant'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: Theme.colors.gray[100],
    marginHorizontal: Theme.spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 2,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.gray[700],
    marginBottom: Theme.spacing.md,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  imageSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Theme.colors.gray[100],
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 11,
    color: Theme.colors.gray[400],
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: Theme.colors.gray[50],
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.dark,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    marginBottom: 4,
  },
  priceInput: {
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statusBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[200],
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.gray[500],
  },
  summaryBox: {
    backgroundColor: Theme.colors.gray[50],
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: Theme.colors.gray[600],
  },
  footer: {
    flexDirection: 'row',
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    gap: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
