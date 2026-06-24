import { Config } from "@/src/api/config";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MenuRecap } from "./recap-designs/MenuRecap";

type Step = "nameImage" | "details" | "recap";

interface AddMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (menu: any) => Promise<void>;
  loading?: boolean;
  existingMenu?: any; // pour la modification
  /** Mode intégré : rend le contenu directement (sans Modal/overlay), pour l'afficher
      dans la zone liste du panel. La modification continue d'utiliser le Modal. */
  embedded?: boolean;
}

const STEPS: Step[] = ["nameImage", "details", "recap"];

// Hauteur fixe du modal d'édition (px) — identique sur tous les écrans.
// = 68% d'un écran de référence de 844px de haut.
const MODAL_HEIGHT = 574;

// Hauteur auto de l'input description : min (1 ligne) → max (puis scroll interne).
const DESC_MIN = 44;
const DESC_MAX = 120;
// Décalage vertical du KeyboardAvoidingView (compense le footer + l'espace au-dessus
// de la sheet). Augmenter = le contenu remonte plus ; diminuer = il colle au clavier.
const KEYBOARD_OFFSET = 90;

// Pressable animable (pour le fondu du backdrop flouté).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Extra ou boisson : nom, prix, quantité, disponibilité. */
type Item = { name: string; prix: string; quantite: string; status: boolean };

const toItem = (x: any): Item => ({
  name: x.name || "",
  prix: String(x.prix ?? 0),
  quantite: String(x.quantite ?? 1),
  status: x.status !== false,
});

export const AddMenuSheetMultiStep: React.FC<AddMenuSheetProps> = ({
  visible,
  onClose,
  onSave,
  loading: externalLoading,
  existingMenu,
  embedded = false,
}) => {
  // En mode intégré, le footer doit dégager la tab bar du bas (toujours visible).
  const EMBEDDED_TAB_BAR = 65;
  const [step, setStep] = useState<Step>("nameImage");
  const [images, setImages] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [nom, setNom] = useState(existingMenu?.name || "");
  const [prix1, setPrix1] = useState(
    existingMenu?.prices?.[0]?.price?.toString() || "",
  );
  const [prix2, setPrix2] = useState(
    existingMenu?.prices?.[1]?.price?.toString() || "",
  );
  const [prix3, setPrix3] = useState(
    existingMenu?.prices?.[2]?.price?.toString() || "",
  );
  const [desc1, setDesc1] = useState(
    existingMenu?.prices?.[0]?.description || "",
  );
  const [desc2, setDesc2] = useState(
    existingMenu?.prices?.[1]?.description || "",
  );
  const [desc3, setDesc3] = useState(
    existingMenu?.prices?.[2]?.description || "",
  );
  // Prix sélectionné dont on édite la description (0 = prix1, 1 = prix2, 2 = prix3).
  const [selectedPriceIdx, setSelectedPriceIdx] = useState(0);
  const [extras, setExtras] = useState<Item[]>(
    existingMenu?.extra?.map(toItem) || [],
  );
  const [drinks, setDrinks] = useState<Item[]>(
    existingMenu?.drink?.map(toItem) || [],
  );
  // Drafts d'édition (ligne input nom + prix) pour chaque catégorie.
  // editIdx = null => on crée un nouvel item ; sinon on édite l'item validé à cet index.
  const [extraDraft, setExtraDraft] = useState({ name: "", prix: "" });
  const [extraEditIdx, setExtraEditIdx] = useState<number | null>(null);
  const [drinkDraft, setDrinkDraft] = useState({ name: "", prix: "" });
  const [drinkEditIdx, setDrinkEditIdx] = useState<number | null>(null);
  const [availability, setAvailability] = useState(
    existingMenu?.status || "available",
  );
  const [stock, setStock] = useState(existingMenu?.stock?.toString() || "0");
  const [uploadProgress, setUploadProgress] = useState([0, 0, 0]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Hauteur auto de l'input description (par prix) : suit le contenu, plafonnée.
  // Au-delà du plafond, le scroll interne du TextInput prend le relais.
  const [descHeights, setDescHeights] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  // Hauteur mesurée de l'input prix → sert de hauteur min à la description
  // (les deux champs sont alignés sur la même ligne).
  const [priceColH, setPriceColH] = useState(0);
  // Ref du ScrollView : pour remonter l'input description au-dessus du clavier au focus.
  const scrollRef = React.useRef<ScrollView>(null);
  // Champ actuellement focus (bordure orange) et champs en erreur (bordure rouge).
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorFields, setErrorFields] = useState<string[]>([]);

  // Style d'un input selon focus / erreur.
  const fieldStyle = (field: string) => [
    focusedField === field && styles.inputFocused,
    errorFields.includes(field) && styles.inputError,
  ];
  // Props communes de focus/blur pour un input.
  const focusProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((f) => (f === field ? null : f)),
  });

  const isModification = !!(existingMenu?.id || existingMenu?._id);

  // Synchronize state when existingMenu changes or modal becomes visible
  React.useEffect(() => {
    if (visible && existingMenu) {
      setNom(existingMenu.name || existingMenu.titre || "");

      const p1 = existingMenu.prices?.[0]?.price || existingMenu.prix1 || "";
      const p2 = existingMenu.prices?.[1]?.price || existingMenu.prix2 || "";
      const p3 = existingMenu.prices?.[2]?.price || existingMenu.prix3 || "";

      setPrix1(p1.toString());
      setPrix2(p2.toString());
      setPrix3(p3.toString());

      setDesc1(
        existingMenu.prices?.[0]?.description || existingMenu.description || "",
      );
      setDesc2(existingMenu.prices?.[1]?.description || "");
      setDesc3(existingMenu.prices?.[2]?.description || "");

      const extrasData = existingMenu.extra || existingMenu.extras || [];
      setExtras(extrasData.map(toItem));

      const drinksData = existingMenu.drink || existingMenu.drinks || [];
      setDrinks(drinksData.map(toItem));

      setAvailability(
        existingMenu.status || existingMenu.disponibilite === "Disponible"
          ? "available"
          : "unavailable",
      );

      setStock((existingMenu?.stock ?? 0).toString());

      const menuImages =
        existingMenu.images || (existingMenu.image ? [existingMenu.image] : []);
      setImages(menuImages);
      setUploadedUrls(menuImages);
    } else if (visible && !existingMenu) {
      reset();
    }
  }, [visible, existingMenu]);

  const reset = () => {
    setStep("nameImage");
    setImages([]);
    setUploadedUrls([]);
    setNom("");
    setPrix1("");
    setPrix2("");
    setPrix3("");
    setDesc1("");
    setDesc2("");
    setDesc3("");
    setDescHeights([0, 0, 0]);
    setExtras([]);
    setDrinks([]);
    setAvailability("available");
    setStock("0");
    setUploadProgress([0, 0, 0]);
  };

  // --- Animations du modal (blur en fondu, sheet en translation) ---
  // anim : 0 = fermé, 1 = ouvert. Pilote l'opacité du blur et le translateY de la sheet.
  const anim = React.useRef(new Animated.Value(0)).current;
  // rendered : garde le Modal monté le temps de jouer l'animation de sortie.
  const [rendered, setRendered] = useState(false);

  React.useEffect(() => {
    if (embedded) return;
    if (visible) {
      setRendered(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
    // anim est stable (ref) ; rendered ne doit pas relancer l'effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, embedded]);

  const handleClose = () => {
    // Joue la sortie (blur fade + sheet slide down) puis remonte au parent.
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setRendered(false);
      reset();
      onClose();
    });
  };

  const pickImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin d'accéder à votre galerie.",
      );
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
      const filename = uri.split("/").pop() || "image.jpg";
      const type = "image/jpeg";

      if (Platform.OS === "web") {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("image", blob, filename);
      } else {
        formData.append("image", { uri, name: filename, type } as any);
      }

      const response = await axios.post(
        `${Config.apiUrl}/image/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
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
        },
      );

      const url = response.data?.url || response.data?.data || "";
      const newUrls = [...uploadedUrls];
      newUrls[index] = url;
      setUploadedUrls(newUrls);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Erreur", `Impossible d'uploader l'image ${index + 1}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const validate = (): { message: string; fields: string[] } | null => {
    if (step === "nameImage") {
      if (!nom.trim())
        return { message: "Le nom ne doit pas être vide", fields: ["nom"] };
      // ⚠️ Obligation des photos désactivée temporairement (à remettre plus tard) :
      // if (images.length < 3) return '3 images doivent être sélectionnées';
      if (!prix1)
        return {
          message: "Le prix 1 ne doit pas être vide",
          fields: ["prix0"],
        };
      if (!desc1.trim())
        return {
          message: "La description du prix 1 ne doit pas être vide",
          fields: ["desc0"],
        };
      if (prix2 && !desc2.trim())
        return {
          message: "La description du prix 2 ne doit pas être vide",
          fields: ["desc1"],
        };
      if (prix3 && !desc3.trim())
        return {
          message: "La description du prix 3 ne doit pas être vide",
          fields: ["desc2"],
        };
    }
    // Page details : extras/boissons libres, stock obligatoire (numérique).
    if (step === "details") {
      if (stock.trim() === "" || isNaN(Number(stock)))
        return {
          message: "Le stock du menu doit être un nombre",
          fields: ["stock"],
        };
    }
    return null;
  };

  const goNext = () => {
    const err = validate();
    if (err) {
      setErrorFields(err.fields);
      // Sélectionne l'onglet du prix fautif pour rendre le champ visible.
      if (err.fields[0]?.startsWith("desc"))
        setSelectedPriceIdx(Number(err.fields[0].slice(4)));
      if (err.fields[0]?.startsWith("prix"))
        setSelectedPriceIdx(Number(err.fields[0].slice(4)));
      Alert.alert("Validation", err.message);
      return;
    }
    setErrorFields([]);

    if (step === "recap") {
      handleSubmit();
      return;
    }

    const currentIdx = STEPS.indexOf(step);
    const nextStep = STEPS[currentIdx + 1];
    if (nextStep) setStep(nextStep);
  };

  const goBack = () => {
    const currentIdx = STEPS.indexOf(step);
    if (currentIdx > 0) setStep(STEPS[currentIdx - 1]);
  };

  const handleSubmit = async () => {
    const finalImages = uploadedUrls.length > 0 ? uploadedUrls : images;

    const parseItems = (items: Item[]) =>
      items
        .filter((x) => x.name.trim())
        .map((x) => ({
          name: x.name.trim(),
          status: x.status,
          prix: Number(x.prix) || 0,
          quantite: Number(x.quantite) || 0,
        }));

    const parsedExtras = parseItems(extras);
    if (parsedExtras.length === 0)
      parsedExtras.push({ name: "Aucun", status: false, prix: 0, quantite: 0 });

    const parsedDrinks = parseItems(drinks);
    if (parsedDrinks.length === 0)
      parsedDrinks.push({
        name: "Aucune",
        status: false,
        prix: 0,
        quantite: 0,
      });

    const menuData = {
      name: nom,
      prices: [
        { price: Number(prix1) || 0, description: desc1 },
        { price: Number(prix2) || 0, description: desc2 },
        { price: Number(prix3) || 0, description: desc3 },
      ].filter((p) => p.price > 0),
      status: availability,
      images: finalImages.filter((i) => i),
      coverImage: finalImages[0] || "",
      coverImageHasBackground: false,
      extra: parsedExtras,
      drink: parsedDrinks,
      stock: Number(stock) || 0,
    };

    try {
      setSubmitting(true);
      await onSave(menuData);
      reset();
    } catch (e) {
      Alert.alert("Erreur", "Impossible de sauvegarder le menu");
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    nameImage: "Nom, prix et photos",
    details: "Extras, boissons, stock et statut",
    recap: "Récapitulatif",
  };

  const totalSteps = STEPS.length;
  const currentStepIndex = STEPS.indexOf(step);
  const progress = (currentStepIndex + 1) / totalSteps;

  const isLoading = externalLoading || submitting || uploadingIdx !== null;

  const inner = (
    <View style={[styles.sheet, embedded && styles.sheetEmbedded]}>
      {/* Header (masqué en mode intégré : on ne garde que la barre de progression) */}
      {!embedded && (
        <View style={styles.header}>
          <View>
            {isModification && (
              <Text style={styles.title}>Modifier le menu</Text>
            )}
            <Text style={styles.subtitle}>{stepTitles[step]}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Theme.colors.gray[500]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Barre de progression */}
      <View
        style={[
          styles.progressBar,
          embedded && { marginTop: Theme.spacing.md },
        ]}
      >
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={KEYBOARD_OFFSET}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Étape 1 : nom + prix + description.
            Pressable : un tap dans le vide ferme le clavier (sortie de la description). */}
        {step === "nameImage" && (
          <Pressable onPress={Keyboard.dismiss}>
            <Text style={styles.fieldLabel}>Nom du menu</Text>
            <TextInput
              style={[styles.input, styles.inputCompact, ...fieldStyle("nom")]}
              placeholder="Ex: Burger Spécial Maison"
              value={nom}
              onChangeText={(t) => {
                setNom(t);
                setErrorFields((e) => e.filter((f) => f !== "nom"));
              }}
              {...focusProps("nom")}
            />

            {/* Label (change selon l'onglet) + tabs Prix 1 / 2 / 3 sur la même ligne */}
            <View
              style={[styles.priceHeaderRow, { marginTop: Theme.spacing.lg }]}
            >
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                {selectedPriceIdx === 0
                  ? "Prix 1 (obligatoire)"
                  : `Prix ${selectedPriceIdx + 1} (optionnel)`}
              </Text>
              <View style={styles.priceTabs}>
                {["Prix 1 *", "Prix 2", "Prix 3"].map((label, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.priceTab,
                      selectedPriceIdx === idx && styles.priceTabActive,
                    ]}
                    onPress={() => setSelectedPriceIdx(idx)}
                  >
                    <Text
                      style={[
                        styles.priceTabText,
                        selectedPriceIdx === idx && styles.priceTabTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {/* Prix + description sur la même ligne, pour le prix sélectionné */}
            <View style={styles.priceDescRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.priceCol,
                  ...fieldStyle(`prix${selectedPriceIdx}`),
                ]}
                placeholder={
                  selectedPriceIdx === 0
                    ? "2000"
                    : selectedPriceIdx === 1
                      ? "3500"
                      : "5000"
                }
                keyboardType="numeric"
                value={
                  selectedPriceIdx === 0
                    ? prix1
                    : selectedPriceIdx === 1
                      ? prix2
                      : prix3
                }
                onChangeText={(t) => {
                  (selectedPriceIdx === 0
                    ? setPrix1
                    : selectedPriceIdx === 1
                      ? setPrix2
                      : setPrix3)(t);
                  setErrorFields((e) =>
                    e.filter((f) => f !== `prix${selectedPriceIdx}`),
                  );
                }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h && h !== priceColH) setPriceColH(h);
                }}
                {...focusProps(`prix${selectedPriceIdx}`)}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.descCol,
                  // Hauteur auto : min = hauteur de l'input prix (même ligne),
                  // grandit avec le contenu jusqu'à DESC_MAX, puis scroll interne.
                  {
                    height: Math.min(
                      DESC_MAX,
                      Math.max(
                        priceColH || DESC_MIN,
                        descHeights[selectedPriceIdx],
                      ),
                    ),
                  },
                  ...fieldStyle(`desc${selectedPriceIdx}`),
                ]}
                placeholder={`Description du prix ${selectedPriceIdx + 1}`}
                value={
                  selectedPriceIdx === 0
                    ? desc1
                    : selectedPriceIdx === 1
                      ? desc2
                      : desc3
                }
                onChangeText={(t) => {
                  (selectedPriceIdx === 0
                    ? setDesc1
                    : selectedPriceIdx === 1
                      ? setDesc2
                      : setDesc3)(t);
                  setErrorFields((e) =>
                    e.filter((f) => f !== `desc${selectedPriceIdx}`),
                  );
                }}
                onContentSizeChange={(e) => {
                  const h = e.nativeEvent.contentSize.height;
                  setDescHeights((prev) => {
                    if (prev[selectedPriceIdx] === h) return prev;
                    const next = [...prev] as [number, number, number];
                    next[selectedPriceIdx] = h;
                    return next;
                  });
                }}
                multiline
                scrollEnabled
                {...focusProps(`desc${selectedPriceIdx}`)}
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>
              Photos du plat (optionnel)
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
                      <Image
                        source={{ uri: images[idx] }}
                        style={styles.imagePreview}
                      />
                      {uploadingIdx === idx && (
                        <View style={styles.uploadOverlay}>
                          <ActivityIndicator color="white" />
                          <Text style={styles.uploadText}>
                            {uploadProgress[idx]}%
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name="camera-outline"
                        size={28}
                        color={Theme.colors.gray[400]}
                      />
                      <Text style={styles.imagePlaceholderText}>
                        Photo {idx + 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        )}

        {/* Étape détails : extras + boissons (tabs) + stock + statut du menu */}
        {step === "details" && (
          <Pressable onPress={Keyboard.dismiss}>
            {/* Deux sections empilées (Extras puis Boissons), même design que les prix :
                ligne label + chips scrollables horizontalement, puis ligne d'édition
                (input nom, input prix, boutons Supprimer / Valider). */}
            {(
              [
                {
                  key: "extras",
                  label: "Extras",
                  list: extras,
                  setList: setExtras,
                  draft: extraDraft,
                  setDraft: setExtraDraft,
                  editIdx: extraEditIdx,
                  setEditIdx: setExtraEditIdx,
                },
                {
                  key: "drinks",
                  label: "Boissons",
                  list: drinks,
                  setList: setDrinks,
                  draft: drinkDraft,
                  setDraft: setDrinkDraft,
                  editIdx: drinkEditIdx,
                  setEditIdx: setDrinkEditIdx,
                },
              ] as const
            ).map((sec) => {
              const items = sec.list.filter((i) => i.name.trim());
              // Annule l'édition / vide le draft.
              const resetDraft = () => {
                sec.setDraft({ name: "", prix: "" });
                sec.setEditIdx(null);
              };
              // Valide le draft : crée un nouvel item ou met à jour celui en édition.
              const validate = () => {
                if (!sec.draft.name.trim()) return;
                const item: Item = {
                  name: sec.draft.name.trim(),
                  prix: sec.draft.prix.trim() || "0",
                  quantite: "1",
                  status: true,
                };
                if (sec.editIdx === null) {
                  sec.setList([...sec.list, item]);
                } else {
                  const next = [...sec.list];
                  next[sec.editIdx] = { ...next[sec.editIdx], ...item };
                  sec.setList(next);
                }
                resetDraft();
              };
              return (
                <View
                  key={sec.key}
                  style={{
                    marginTop: sec.key === "drinks" ? Theme.spacing.lg : 0,
                  }}
                >
                  {/* Ligne label + chips scrollables (pas de retour à la ligne) */}
                  <View
                    style={[
                      styles.priceHeaderRow,
                      { marginBottom: Theme.spacing.sm },
                    ]}
                  >
                    <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                      {sec.label}
                    </Text>
                    {items.length > 0 && (
                      <Text style={styles.itemCountText}>×{items.length}</Text>
                    )}
                    {items.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipScroll}
                        contentContainerStyle={styles.chipScrollContent}
                        keyboardShouldPersistTaps="handled"
                      >
                        {items.map((it, i) => {
                          const realIdx = sec.list.indexOf(it);
                          return (
                            <React.Fragment key={realIdx}>
                              {i > 0 && (
                                <Text style={styles.chipSeparator}>·</Text>
                              )}
                              <TouchableOpacity
                                style={styles.itemChip}
                                onPress={() => {
                                  sec.setDraft({
                                    name: it.name,
                                    prix: it.prix,
                                  });
                                  sec.setEditIdx(realIdx);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.itemChipText,
                                    sec.editIdx === realIdx &&
                                      styles.itemChipTextActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {it.name}
                                </Text>
                              </TouchableOpacity>
                            </React.Fragment>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* Ligne d'édition : nom, prix, supprimer, valider */}
                  <View style={styles.priceDescRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.itemInputCompact,
                        styles.descCol,
                      ]}
                      placeholder={
                        sec.key === "extras"
                          ? "Nom de l'extra"
                          : "Nom de la boisson"
                      }
                      value={sec.draft.name}
                      onChangeText={(t) =>
                        sec.setDraft({ ...sec.draft, name: t })
                      }
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.itemInputCompact,
                        styles.priceCol,
                      ]}
                      placeholder="Prix"
                      keyboardType="numeric"
                      value={sec.draft.prix}
                      onChangeText={(t) =>
                        sec.setDraft({ ...sec.draft, prix: t })
                      }
                    />
                    {/* Supprimer : retire l'item en édition (sinon vide juste le draft) */}
                    <TouchableOpacity
                      style={styles.itemActionBtn}
                      onPress={() => {
                        if (sec.editIdx !== null) {
                          sec.setList(
                            sec.list.filter((_, i) => i !== sec.editIdx),
                          );
                        }
                        resetDraft();
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={Theme.colors.danger}
                      />
                    </TouchableOpacity>
                    {/* Valider : ajoute / met à jour */}
                    <TouchableOpacity
                      style={[styles.itemActionBtn, styles.itemValidateBtn]}
                      onPress={validate}
                    >
                      <Ionicons name="checkmark" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Ligne 1 : disponibilité (Disponible / Indisponible côte à côte) */}
            <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>
              Disponibilité
            </Text>
            <View style={styles.availRow}>
              {(
                [
                  {
                    key: "available",
                    label: "Disponible",
                    color: Theme.colors.success,
                  },
                  {
                    key: "unavailable",
                    label: "Indisponible",
                    color: Theme.colors.danger,
                  },
                ] as const
              ).map((s) => {
                const active = availability === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.availBtn,
                      active && {
                        backgroundColor: s.color,
                        borderColor: s.color,
                      },
                    ]}
                    onPress={() => setAvailability(s.key)}
                  >
                    <Text
                      style={[
                        styles.availBtnText,
                        { color: active ? "white" : s.color },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ligne 2 : stock — chiffres horizontaux scrollables + gros chiffre + -/+ */}
            <View style={styles.stockSection}>
              <Text style={styles.fieldLabel}>Stock disponible</Text>
              <View style={styles.stockSectionHead}>
                {/* Chiffres horizontaux scrollables, puis le stepper */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tensScroll}
                  contentContainerStyle={styles.tensRowContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {Array.from({ length: 21 }, (_, i) => i * 10).map((n) => {
                    const active = (Number(stock) || 0) === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.tensChip,
                          active && styles.tensChipActive,
                        ]}
                        onPress={() => {
                          setStock(String(n));
                          setErrorFields((e) => e.filter((f) => f !== "stock"));
                        }}
                      >
                        <Text
                          style={[
                            styles.tensChipText,
                            active && styles.tensChipTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.stockStepperRow}>
                  <TouchableOpacity
                    style={styles.stockStepBtn}
                    onPress={() => {
                      setStock(String(Math.max(0, (Number(stock) || 0) - 1)));
                      setErrorFields((e) => e.filter((f) => f !== "stock"));
                    }}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={Theme.colors.dark}
                    />
                  </TouchableOpacity>
                  <Text style={styles.stockBigValue}>{Number(stock) || 0}</Text>
                  <TouchableOpacity
                    style={[styles.stockStepBtn, styles.stockStepBtnPlus]}
                    onPress={() => {
                      setStock(String((Number(stock) || 0) + 1));
                      setErrorFields((e) => e.filter((f) => f !== "stock"));
                    }}
                  >
                    <Ionicons name="add" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* Étape récapitulatif : 3 designs explorables (Aperçu / Blocs / Édito). */}
        {step === "recap" && (
          <MenuRecap
            draft={{
              nom,
              prix: [prix1, prix2, prix3],
              desc: [desc1, desc2, desc3],
              extras,
              drinks,
              availability,
              stock,
              images,
            }}
          />
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer navigation */}
      <View
        style={[
          styles.footer,
          embedded && {
            paddingTop: Theme.spacing.sm,
            // Au-dessus de la tab bar (toujours visible) + marge pour ne pas la chevaucher.
            paddingBottom: EMBEDDED_TAB_BAR + Theme.spacing.lg * 1.5,
          },
        ]}
      >
        {step !== "nameImage" && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons
              name="arrow-back"
              size={20}
              color={Theme.colors.gray[600]}
            />
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
              {step === "recap"
                ? isModification
                  ? "Modifier"
                  : "Créer le menu"
                : "Suivant"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Mode intégré : rendu direct dans la zone liste (le parent gère l'affichage conditionnel).
  // Pas de KeyboardAvoidingView ici : on ne veut PAS que le footer remonte à l'ouverture
  // du clavier — le contenu (ScrollView) défile, le footer reste en place.
  if (embedded) {
    return <View style={styles.embeddedContainer}>{inner}</View>;
  }

  // Mode modal (modification).
  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Flou + dégradé orange (comme le header général) — vient en fondu, tap pour fermer */}
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, { opacity: anim }]}
          onPress={handleClose}
        >
          <BlurView
            intensity={40}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayDim} />
        </AnimatedPressable>
        {/* La sheet vient en translation (slide up/down) et ne ferme pas au tap */}
        <Animated.View
          style={[
            styles.sheetWrap,
            {
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [MODAL_HEIGHT, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {inner}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // Voile sombre par-dessus le flou.
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  // Conteneur de la sheet : hauteur fixe en px (identique sur tous les écrans).
  sheetWrap: {
    height: MODAL_HEIGHT,
  },
  sheet: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  // Mode intégré : occupe toute la zone liste, sans radius ni overlay.
  embeddedContainer: {
    flex: 1,
  },
  sheetEmbedded: {
    flex: 1,
    maxHeight: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
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
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Theme.colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
    // Débattement bas pour que le champ focus puisse remonter au-dessus du clavier.
    paddingBottom: Theme.spacing.lg + 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.colors.gray[700],
    marginBottom: Theme.spacing.md,
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  imageSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Theme.colors.gray[100],
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 11,
    color: Theme.colors.gray[400],
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  uploadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
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
  // Nom : un peu moins haut.
  inputCompact: {
    paddingVertical: Theme.spacing.sm + 8,
  },
  // Input focus : bordure orange.
  inputFocused: {
    borderColor: Theme.colors.primary,
  },
  // Input en erreur de validation : bordure rouge.
  inputError: {
    borderColor: Theme.colors.danger,
  },
  priceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  priceTabs: {
    flexDirection: "row",
    gap: 6,
  },
  priceTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.gray[100],
  },
  priceTabActive: {
    backgroundColor: Theme.colors.primary,
  },
  priceTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.gray[500],
  },
  priceTabTextActive: {
    color: "white",
  },
  priceDescRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  priceCol: {
    width: 90,
    textAlign: "center",
  },
  descCol: {
    flex: 1,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    gap: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  // --- Page détails : sections extras/boissons (chips + ligne d'édition) ---
  // ScrollView horizontale des chips, à côté du label (ne wrappe jamais).
  chipScroll: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  chipScrollContent: {
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  itemChip: {
    paddingVertical: 5,
    maxWidth: 140,
  },
  itemChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Theme.colors.gray[700],
  },
  chipSeparator: {
    fontSize: 13,
    color: Theme.colors.gray[300],
  },
  itemChipTextActive: {
    color: Theme.colors.primary,
  },
  // Compteur : texte coloré sans fond, juste à côté du label.
  itemCountText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  // Inputs nom/prix de la ligne d'édition : un peu moins hauts.
  itemInputCompact: {
    paddingVertical: 9,
  },
  // Boutons supprimer / valider de la ligne d'édition.
  itemActionBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.gray[100],
    alignSelf: "stretch",
  },
  itemValidateBtn: {
    backgroundColor: Theme.colors.primary,
  },
  // --- Disponibilité (ligne 1) ---
  availRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  availBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[200],
    backgroundColor: "white",
    alignItems: "center",
  },
  availBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  // --- Stock (ligne 2) ---
  stockSection: {
    marginTop: Theme.spacing.lg,
  },
  stockSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  stockStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stockBigValue: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: Theme.colors.dark,
  },
  stockStepBtn: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.gray[100],
  },
  stockStepBtnPlus: {
    backgroundColor: Theme.colors.primary,
  },
  // Chiffres horizontaux scrollables (entre le label et le stepper).
  tensScroll: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  tensRowContent: {
    gap: 8,
    paddingVertical: 2,
    alignItems: "center",
  },
  tensChip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.gray[100],
    alignItems: "center",
  },
  tensChipActive: {
    backgroundColor: Theme.colors.primary,
  },
  tensChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: Theme.colors.gray[600],
  },
  tensChipTextActive: {
    color: "white",
  },
});
