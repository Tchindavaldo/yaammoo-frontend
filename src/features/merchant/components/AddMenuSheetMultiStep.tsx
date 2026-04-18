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

type Step = 'image' | 'name' | 'price' | 'desc1' | 'desc2' | 'extras' | 'stock' | 'status';

interface AddMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (menu: any) => Promise<void>;
  loading?: boolean;
  existingMenu?: any; // pour la modification
}

const STEPS: Step[] = ['image', 'name', 'price', 'desc1', 'desc2', 'extras', 'stock', 'status'];

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
  const [extras, setExtras] = useState<Array<{name: string, prix: string}>>(
    existingMenu?.extra?.map((e: any) => ({ name: e.name, prix: String(e.prix || 0) })) || []
  );
  const [drinks, setDrinks] = useState<Array<{name: string, prix: string}>>(
    existingMenu?.drink?.map((d: any) => ({ name: d.name, prix: String(d.prix || 0) })) || []
  );
  const [availability, setAvailability] = useState(existingMenu?.status || 'available');
  const [stock, setStock] = useState(existingMenu?.stock?.toString() || '0');
  const [uploadProgress, setUploadProgress] = useState([0, 0, 0]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isModification = !!(existingMenu?.id || existingMenu?._id);

  // Synchronize state when existingMenu changes or modal becomes visible
  React.useEffect(() => {
    if (visible && existingMenu) {
      setNom(existingMenu.name || existingMenu.titre || '');

      const p1 = existingMenu.prices?.[0]?.price || existingMenu.prix1 || '';
      const p2 = existingMenu.prices?.[1]?.price || existingMenu.prix2 || '';
      const p3 = existingMenu.prices?.[2]?.price || existingMenu.prix3 || '';

      setPrix1(p1.toString());
      setPrix2(p2.toString());
      setPrix3(p3.toString());

      setDesc1(existingMenu.prices?.[0]?.description || existingMenu.description || '');
      setDesc2(existingMenu.prices?.[1]?.description || '');
      setDesc3(existingMenu.prices?.[2]?.description || '');

      const extrasData = existingMenu.extra || existingMenu.extras || [];
      setExtras(extrasData.map((e: any) => ({ name: e.name, prix: String(e.prix || 0) })));

      const drinksData = existingMenu.drink || existingMenu.drinks || [];
      setDrinks(drinksData.map((d: any) => ({ name: d.name, prix: String(d.prix || 0) })));

      setAvailability(existingMenu.status || existingMenu.disponibilite === 'Disponible' ? 'available' : 'unavailable');

      setStock((existingMenu?.stock ?? 0).toString());

      const menuImages = existingMenu.images || (existingMenu.image ? [existingMenu.image] : []);
      setImages(menuImages);
      setUploadedUrls(menuImages);
    } else if (visible && !existingMenu) {
      reset();
    }
  }, [visible, existingMenu]);

  const reset = () => {
    setStep('image');
    setImages([]);
    setUploadedUrls([]);
    setNom('');
    setPrix1(''); setPrix2(''); setPrix3('');
    setDesc1(''); setDesc2(''); setDesc3('');
    setExtras([]);
    setDrinks([]);
    setAvailability('available');
    setStock('0');
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

      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', { uri, name: filename, type } as any);
      }

      const response = await axios.post(`${Config.apiUrl}/image/upload`, formData, {
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
    if (step === 'extras' && extras.length === 0) return 'Veuillez ajouter au moins un extra';
    if (step === 'extras' && drinks.length === 0) return 'Veuillez ajouter au moins une boisson';
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
      else setStep('extras');
      return;
    }

    if (step === 'desc2') {
      setStep('extras');
      return;
    }

    if (step === 'extras') {
      setStep('stock');
      return;
    }

    if (step === 'stock') {
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
      setStep('stock');
      return;
    }
    if (step === 'stock') {
      setStep('extras');
      return;
    }
    if (step === 'extras') {
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

    const parsedExtras = extras
      .filter(e => e.name.trim())
      .map((e: any) => ({ name: e.name.trim(), status: true, prix: Number(e.prix) || 0 }));
    if (parsedExtras.length === 0) parsedExtras.push({ name: 'Aucun', status: false, prix: 0 });

    const parsedDrinks = drinks
      .filter(d => d.name.trim())
      .map((d: any) => ({ name: d.name.trim(), status: true, prix: Number(d.prix) || 0 }));
    if (parsedDrinks.length === 0) parsedDrinks.push({ name: 'Aucune', status: false, prix: 0 });

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
      coverImageHasBackground: false,
      extra: parsedExtras,
      drink: parsedDrinks,
      stock: Number(stock) || 0
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
    extras: 'Extras et Boissons',
    stock: 'Stock disponible',
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

            {/* Étape extras */}
            {step === 'extras' && (
              <View>
                {/* Extras Section */}
                <Text style={styles.fieldLabel}>Extras proposés</Text>
                <ScrollView style={{ maxHeight: 200, marginBottom: Theme.spacing.lg }}>
                  {extras.map((extra, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <TextInput
                        style={[styles.input, styles.itemInput, { flex: 2 }]}
                        placeholder="Nom de l'extra"
                        value={extra.name}
                        onChangeText={(text) => {
                          const newExtras = [...extras];
                          newExtras[idx].name = text;
                          setExtras(newExtras);
                        }}
                      />
                      <TextInput
                        style={[styles.input, styles.itemInput, { flex: 1, marginHorizontal: 8 }]}
                        placeholder="Prix"
                        keyboardType="numeric"
                        value={extra.prix}
                        onChangeText={(text) => {
                          const newExtras = [...extras];
                          newExtras[idx].prix = text;
                          setExtras(newExtras);
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setExtras(extras.filter((_, i) => i !== idx))}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setExtras([...extras, { name: '', prix: '0' }])}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Theme.colors.primary} />
                  <Text style={styles.addBtnText}>Ajouter un extra</Text>
                </TouchableOpacity>

                {/* Drinks Section */}
                <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>Boissons proposées</Text>
                <ScrollView style={{ maxHeight: 200, marginBottom: Theme.spacing.lg }}>
                  {drinks.map((drink, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <TextInput
                        style={[styles.input, styles.itemInput, { flex: 2 }]}
                        placeholder="Nom de la boisson"
                        value={drink.name}
                        onChangeText={(text) => {
                          const newDrinks = [...drinks];
                          newDrinks[idx].name = text;
                          setDrinks(newDrinks);
                        }}
                      />
                      <TextInput
                        style={[styles.input, styles.itemInput, { flex: 1, marginHorizontal: 8 }]}
                        placeholder="Prix"
                        keyboardType="numeric"
                        value={drink.prix}
                        onChangeText={(text) => {
                          const newDrinks = [...drinks];
                          newDrinks[idx].prix = text;
                          setDrinks(newDrinks);
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => setDrinks(drinks.filter((_, i) => i !== idx))}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setDrinks([...drinks, { name: '', prix: '0' }])}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Theme.colors.primary} />
                  <Text style={styles.addBtnText}>Ajouter une boisson</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Étape stock */}
            {step === 'stock' && (
              <View>
                <Text style={styles.fieldLabel}>Stock disponible</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center' }]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={stock}
                  onChangeText={setStock}
                  autoFocus
                />
                <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>Aperçu du résumé</Text>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryTitle}>📋 Résumé</Text>
                  <Text style={styles.summaryText}>Nom : {nom}</Text>
                  <Text style={styles.summaryText}>Prix 1 : {prix1}F</Text>
                  {prix2 ? <Text style={styles.summaryText}>Prix 2 : {prix2}F</Text> : null}
                  {prix3 ? <Text style={styles.summaryText}>Prix 3 : {prix3}F</Text> : null}
                  <Text style={styles.summaryText}>Photos : {images.length}</Text>
                  <Text style={styles.summaryText}>Stock : {stock}</Text>
                </View>
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
                  <Text style={styles.summaryText}>Stock : {stock}</Text>
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
  itemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  itemInput: {
    paddingVertical: Theme.spacing.sm,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.danger + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.primary + '05',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
});
