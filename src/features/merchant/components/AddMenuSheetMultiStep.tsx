"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { showToast } from "@/src/services/globalToast";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Safe-area basse au ratio par OS (iOS 0.5 / Android 1), cf. blur-safe-area.md §4.
import { useSheetSafeInsets as useSafeAreaInsets } from "@/src/hooks/usePageBottomInset";
import { MenuRecap } from "./recap-designs/MenuRecap";
import { Availability, DraftItem, DraftPrice } from "./recap-designs/MenuDraft.types";
import { styles } from "./menu-form/AddMenuSheet.styles";
import { MenuFormModal, useSheetAnimation } from "./menu-form/MenuFormModal";
import { useMenuImageUpload } from "./menu-form/useMenuImageUpload";
import { MenuPricesEditor } from "./menu-form/MenuPricesEditor";
import { MenuExtrasEditor } from "./menu-form/MenuExtrasEditor";
import { MenuStockAvailability } from "./menu-form/MenuStockAvailability";
import { MenuPhotoSlots } from "./menu-form/MenuPhotoSlots";
import { MenuPricePreviewCard } from "./menu-form/MenuPricePreviewCard";
import { useMenuPriceCheck, LOADING_NEXT } from "./menu-form/useMenuPricePreview";
import { menuPriceStepActions } from "./menu-form/menuPriceStepActions";
import { t as tr, useLanguage } from "@/src/i18n";
import { apiErrorMessage } from "@/src/api/apiError";

import { MenuNameCategoryStep } from "./menu-form/MenuNameCategoryStep";
import { MenuStep as Step, validateMenuStep } from "./menu-form/validateMenuStep";

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

const STEPS: Step[] = ["nameImage", "prices", "details", "recap"];

// Décalage vertical du KeyboardAvoidingView (compense le footer + l'espace au-dessus
// de la sheet). Augmenter = le contenu remonte plus ; diminuer = il colle au clavier.
const KEYBOARD_OFFSET = 90;

// Wrapper « tap dans le vide ferme le clavier » sur natif. Sur le WEB, un
// Pressable parent avec onPress intercepte le clic et empêche le focus des
// TextInput enfants → on rend une simple View (le clavier n'existe pas sur web).
const DismissKeyboardWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) =>
  Platform.OS === "web" ? (
    <View>{children}</View>
  ) : (
    <Pressable onPress={Keyboard.dismiss}>{children}</Pressable>
  );

const toItem = (x: any): DraftItem => ({
  name: x.name || "",
  prix: String(x.prix ?? 0),
  quantite: String(x.quantite ?? 1),
  status: x.status !== false,
});

/** Prix d'un menu existant → lignes éditables (N prix, au moins une). */
const toPrices = (menu: any): DraftPrice[] => {
  const list: DraftPrice[] = (menu?.prices || []).map((p: any) => ({
    price: p?.price ? String(p.price) : "",
    description: p?.description || "",
  }));
  return list.length > 0 ? list : [{ price: "", description: "" }];
};

export const AddMenuSheetMultiStep: React.FC<AddMenuSheetProps> = ({
  visible,
  onClose,
  onSave,
  loading: externalLoading,
  existingMenu,
  embedded = false,
}) => {
  useLanguage();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("nameImage");
  const {
    images,
    uploadedUrls,
    uploadProgress,
    uploadingIdx,
    pickImage,
    load: loadImages,
    resetImages,
  } = useMenuImageUpload();
  const [nom, setNom] = useState(existingMenu?.name || "");
  // Catégorie libre du plat (filtre du home, backend migration 088).
  const [category, setCategory] = useState(existingMenu?.category || "");
  // N prix (plus limité à 3) : au moins une ligne, la 1re est obligatoire.
  const [prices, setPrices] = useState<DraftPrice[]>(toPrices(existingMenu));
  // Prix sélectionné dont on édite montant + description (index 0-based).
  const [selectedPriceIdx, setSelectedPriceIdx] = useState(0);
  // Vérification serveur des prix : bouton ✓ (un prix) et « Suivant » (tous).
  const priceCheck = useMenuPriceCheck(prices);
  const [extras, setExtras] = useState<DraftItem[]>(
    existingMenu?.extra?.map(toItem) || [],
  );
  const [availability, setAvailability] = useState<Availability>(
    existingMenu?.status || "available",
  );
  const [stock, setStock] = useState(existingMenu?.stock?.toString() || "0");
  const [submitting, setSubmitting] = useState(false);
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
  const clearError = (field: string) =>
    setErrorFields((e) => e.filter((f) => f !== field));

  const isModification = !!(existingMenu?.id || existingMenu?._id);

  // Synchronize state when existingMenu changes or modal becomes visible
  React.useEffect(() => {
    if (visible && existingMenu) {
      setNom(existingMenu.name || existingMenu.titre || "");
      setCategory(existingMenu.category || "");
      priceCheck.prefetchOnNextPrices();
      setPrices(toPrices(existingMenu));
      setSelectedPriceIdx(0);

      const extrasData = existingMenu.extra || existingMenu.extras || [];
      setExtras(extrasData.map(toItem));

      // `status` est une chaîne : la tester en booléen donnait toujours « Disponible ».
      const off = existingMenu.status === "unavailable" || (!existingMenu.status && existingMenu.disponibilite === "Indisponible");
      setAvailability(off ? "unavailable" : "available");

      setStock((existingMenu?.stock ?? 0).toString());

      loadImages(
        existingMenu.images || (existingMenu.image ? [existingMenu.image] : []),
      );
    } else if (visible && !existingMenu) {
      reset();
    }
  }, [visible, existingMenu]);

  const reset = () => {
    setStep("nameImage");
    resetImages();
    setNom("");
    setCategory("");
    setPrices([{ price: "", description: "" }]);
    setSelectedPriceIdx(0);
    setExtras([]);
    setAvailability("available");
    setStock("0");
  };

  // Animations du modal (blur en fondu, sheet en translation).
  const { anim, rendered, closeAnimated } = useSheetAnimation(visible, embedded);

  const handleClose = () =>
    closeAnimated(() => {
      reset();
      onClose();
    });

  const validate = () =>
    validateMenuStep({
      step,
      nom,
      category,
      prices,
      uploadedCount: uploadedUrls.filter(Boolean).length,
      stock,
    });

  const priceActions = menuPriceStepActions({
    priceCheck,
    selectedIdx: selectedPriceIdx,
    setSelectedIdx: setSelectedPriceIdx,
    setErrorFields,
    clearError,
  });

  const goNext = async () => {
    const err = validate();
    if (err) {
      setErrorFields(err.fields);
      // Sélectionne l'onglet du prix fautif pour rendre le champ visible.
      if (err.fields[0]?.startsWith("desc"))
        setSelectedPriceIdx(Number(err.fields[0].slice(4)));
      if (err.fields[0]?.startsWith("prix"))
        setSelectedPriceIdx(Number(err.fields[0].slice(4)));
      showToast(err.message, "error");
      return;
    }
    setErrorFields([]);

    // Étape prix : tous les prix vérifiés côté serveur en une requête.
    if (step === "prices" && !(await priceActions.checkAllPrices())) return;

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

    const parsedExtras = extras
      .filter((x) => x.name.trim())
      .map((x) => ({
        name: x.name.trim(),
        status: x.status,
        prix: Number(x.prix) || 0,
        quantite: Number(x.quantite) || 0,
      }));
    if (parsedExtras.length === 0)
      parsedExtras.push({ name: "Aucun", status: false, prix: 0, quantite: 0 });

    // Les boissons ne sont plus envoyées : elles appartiennent à la boutique
    // (`fastfood.drinks`, géré par `ShopDrinksPage`).
    const menuData = {
      name: nom,
      category: category.trim(),
      prices: prices
        .map((p) => ({ price: Number(p.price) || 0, description: p.description }))
        .filter((p) => p.price > 0),
      status: availability,
      images: finalImages.filter((i) => i),
      coverImage: finalImages[0] || "",
      coverImageHasBackground: false,
      extra: parsedExtras,
      stock: Number(stock) || 0,
    };

    try {
      setSubmitting(true);
      await onSave(menuData);
      reset();
    } catch (e: any) {
      // Priorité au message précis renvoyé par le backend (champ rejeté,
      // raison métier) — le générique ne sert que de filet si l'API ne
      // renvoie rien d'exploitable.
      const backendMessage = apiErrorMessage(e) || e?.message;
      showToast(backendMessage || tr("Impossible de sauvegarder le menu"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    nameImage: tr("Nom, catégorie et photos"),
    prices: tr("Prix"),
    details: tr("Extras, disponibilité et stock"),
    recap: tr("Récapitulatif"),
  };

  const totalSteps = STEPS.length;
  const currentStepIndex = STEPS.indexOf(step);
  const progress = (currentStepIndex + 1) / totalSteps;

  // Loader du bouton « Suivant » : uniquement pour la soumission du menu, PAS
  // pour l'upload d'image (qui a son propre loader sur la vignette). Pendant un
  // upload, le bouton reste juste désactivé (isBusy), sans spinner.
  const isLoading = externalLoading || submitting;
  const isBusy = isLoading || uploadingIdx !== null;

  const inner = (
    <View style={[styles.sheet, embedded && styles.sheetEmbedded]}>
      {/* Header (masqué en mode intégré : on ne garde que la barre de progression) */}
      {!embedded && (
        <View style={styles.header}>
          <View>
            {isModification && (
              <Text style={styles.title}>{tr("Modifier le menu")}</Text>
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
          {/* Étape 1 (D1) : nom, catégorie + suggestions, photos. */}
          {step === "nameImage" && (
            <DismissKeyboardWrapper>
              <MenuNameCategoryStep
                nom={nom}
                onNomChange={(t) => {
                  setNom(t);
                  clearError("nom");
                }}
                category={category}
                onCategoryChange={(t) => {
                  setCategory(t);
                  clearError("category");
                }}
                fieldStyle={fieldStyle}
                focusProps={focusProps}
              />
              <MenuPhotoSlots
                images={images}
                uploadProgress={uploadProgress}
                uploadingIdx={uploadingIdx}
                pickImage={pickImage}
              />
            </DismissKeyboardWrapper>
          )}

          {/* Étape 2 (D2) : prix + aperçu (prix affiché, frais, vous recevez). */}
          {step === "prices" && (
            <DismissKeyboardWrapper>
              <MenuPricesEditor
                prices={prices}
                setPrices={setPrices}
                selectedIdx={selectedPriceIdx}
                setSelectedIdx={setSelectedPriceIdx}
                fieldStyle={fieldStyle}
                focusProps={focusProps}
                clearError={clearError}
                validated={priceCheck.isValidated(selectedPriceIdx)}
                checking={priceCheck.loadingIdx === selectedPriceIdx}
                onValidate={priceActions.validateSelected}
                onRemove={priceCheck.removeAt}
              />
              <MenuPricePreviewCard
                preview={priceCheck.previewAt(selectedPriceIdx)}
                loading={priceCheck.cardLoading(selectedPriceIdx)}
              />
            </DismissKeyboardWrapper>
          )}

          {/* Étape 3 (D3) : extras, disponibilité, stock. */}
          {step === "details" && (
            <DismissKeyboardWrapper>
              <MenuExtrasEditor extras={extras} setExtras={setExtras} />
              <MenuStockAvailability
                availability={availability}
                setAvailability={setAvailability}
                stock={stock}
                setStock={(v) => {
                  setStock(v);
                  clearError("stock");
                }}
              />
            </DismissKeyboardWrapper>
          )}

          {/* Étape récapitulatif : 3 designs explorables (Aperçu / Blocs / Édito). */}
          {step === "recap" && (
            <MenuRecap
              draft={{
                nom,
                prices,
                extras,
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
          // Pied pose sur la bande safe-area, sans marge en plus (R19) :
          // - intégré : la page entière (ShopPageFrame) a déjà réservé la bande ;
          // - modal : le pied descend jusqu'au bord et absorbe la bande.
          embedded
            ? { paddingTop: Theme.spacing.sm, paddingBottom: 0 }
            : { paddingBottom: insets.bottom },
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
          style={[styles.nextBtn, isBusy && styles.nextBtnDisabled]}
          onPress={goNext}
          disabled={isBusy || priceCheck.loadingIdx !== null}
        >
          {isLoading || priceCheck.loadingIdx === LOADING_NEXT ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === "recap"
                ? isModification
                  ? tr("Modifier")
                  : tr("Créer le menu")
                : tr("Suivant")}
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
    <MenuFormModal
      rendered={rendered}
      anim={anim}
      onRequestClose={handleClose}
      bottomInset={insets.bottom}
    >
      {inner}
    </MenuFormModal>
  );
};
