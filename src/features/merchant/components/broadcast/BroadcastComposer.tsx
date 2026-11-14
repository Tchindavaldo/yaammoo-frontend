"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  BroadcastAudience,
  BroadcastDraft,
  BroadcastShop,
} from "../../types/broadcast.types";
import { BroadcastAudiencePicker } from "./BroadcastAudiencePicker";
import { BroadcastPreview } from "./BroadcastPreview";
import { BC, capsLabel } from "./broadcastTheme";
import { t as tr, useLanguage } from "@/src/i18n";

const TITLE_MAX = 50;
const BODY_MAX = 150;

interface Props {
  /** Brouillon de départ (vide, ou envoi réutilisé). */
  initial: BroadcastDraft;
  /** Photos des menus de la boutique, proposées en premier. */
  menuImages: string[];
  /** Audiences permises par le plan, et villes desservies par la boutique. */
  audiences: BroadcastAudience[];
  cities: string[];
  /** Envois encore possibles aujourd'hui par audience. */
  audienceLeft?: Partial<Record<BroadcastAudience, number>>;
  /** Nom et photo de la boutique, pour l'aperçu (null = pas encore chargés). */
  shop: BroadcastShop | null;
  sending: boolean;
  /** Décalage bas au repos (au-dessus de la tab bar). */
  restBottom: number;
  onSend: (draft: BroadcastDraft) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Composeur flottant : destinataires, aperçu en direct, titre, puis message et
 * image révélés à la demande. Rendu dans l'overlay (pas de <Modal>) et remonté
 * au-dessus du clavier comme le retrait du portefeuille.
 */
export const BroadcastComposer: React.FC<Props> = ({
  initial,
  menuImages,
  audiences,
  cities,
  audienceLeft,
  shop,
  sending,
  restBottom,
  onSend,
  onClose,
}) => {
  useLanguage();
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [bodyOn, setBodyOn] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(initial.imageUri);
  const [pickOn, setPickOn] = useState(true);
  const [galleryUri, setGalleryUri] = useState<string | null>(
    initial.imageUri && !menuImages.includes(initial.imageUri) ? initial.imageUri : null,
  );
  const [audience, setAudience] = useState<BroadcastAudience>(initial.audience);
  const [city, setCity] = useState<string | null>(initial.city);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const bodyRef = useRef<TextInput>(null);

  const [enter] = useState(() => new Animated.Value(0));
  const [bottom] = useState(() => new Animated.Value(restBottom));

  useEffect(() => {
    // Driver JS : une opacité animée en natif bloque le défilement de la
    // bande de photos sur Android (cf. architecture/blur-safe-area.md).
    Animated.timing(enter, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  }, [enter]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) => {
      setKeyboardOpen(true);
      Animated.spring(bottom, {
        toValue: e.endCoordinates.height + 8,
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();
    });
    const h = Keyboard.addListener(hideEvt, () => {
      setKeyboardOpen(false);
      Animated.spring(bottom, {
        toValue: restBottom,
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();
    });
    return () => {
      s.remove();
      h.remove();
    };
  }, [bottom, restBottom]);

  const close = () => {
    Keyboard.dismiss();
    Animated.timing(enter, { toValue: 0, duration: 160, useNativeDriver: false }).start(
      () => onClose(),
    );
  };

  const onBackdrop = () => (keyboardOpen ? Keyboard.dismiss() : close());

  const toggleBody = () => {
    // Pas de focus auto : le clavier ne s'ouvre qu'au toucher d'un champ.
    setBodyOn(!bodyOn);
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setGalleryUri(result.assets[0].uri);
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking broadcast image:", error);
    }
  };

  const hasTitle = title.trim().length > 0;
  // « Ville » exige une ville choisie (plusieurs villes desservies).
  const canSend = hasTitle && !sending && (audience !== "city" || !!city);
  const hasImage = pickOn || !!imageUri;
  const strip = galleryUri ? [galleryUri, ...menuImages] : menuImages;

  const submit = async () => {
    if (!canSend) return;
    Keyboard.dismiss();
    const ok = await onSend({ title, body: bodyOn ? body : "", imageUri, audience, city });
    if (ok) close();
  };

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    // Au-dessus du TabHeader de la page (zIndex 1000) : voile ET carte.
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: enter }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onBackdrop}
          accessibilityLabel={tr("Fermer")}
        />
      </Animated.View>

      <Animated.View
        style={[styles.card, { bottom, opacity: enter, transform: [{ translateY }] }]}
      >
        <View style={styles.top}>
          <Text style={capsLabel}>{tr("NOUVELLE NOTIFICATION")}</Text>
          <Pressable onPress={close} hitSlop={10} style={styles.closeBtn} accessibilityLabel={tr("Fermer")}>
            <Ionicons name="close" size={16} color={BC.ink} />
          </Pressable>
        </View>

        {/* Masqué clavier ouvert : un choix, pas une saisie, et la place manque. */}
        {!keyboardOpen && (
          <BroadcastAudiencePicker
            audiences={audiences}
            cities={cities}
            audience={audience}
            city={city}
            left={audienceLeft}
            onChange={(a, c) => {
              setAudience(a);
              setCity(c);
            }}
          />
        )}

        {/* Le push n'affiche que boutique + titre : pas de message dans l'aperçu. */}
        <BroadcastPreview shop={shop} title={title} body="" imageUri={imageUri} />

        <TextInput
          value={title}
          onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
          placeholder={tr("Titre")}
          placeholderTextColor="#8A8A90"
          maxLength={TITLE_MAX}
          style={styles.titleInput}
          returnKeyType={bodyOn ? "next" : "done"}
          onSubmitEditing={() => bodyOn && bodyRef.current?.focus()}
          accessibilityLabel={tr("Titre")}
        />

        {bodyOn && (
          <TextInput
            ref={bodyRef}
            value={body}
            onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
            placeholder={tr("Message")}
            placeholderTextColor="#8A8A90"
            maxLength={BODY_MAX}
            multiline
            style={styles.bodyInput}
            accessibilityLabel={tr("Message")}
          />
        )}

        {pickOn && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={pickFromGallery} style={styles.galleryTile} accessibilityLabel={tr("Choisir dans la galerie")}>
              <Ionicons name="images-outline" size={22} color={BC.ink} />
            </Pressable>
            {strip.map((uri) => {
              const sel = uri === imageUri;
              return (
                <Pressable
                  key={uri}
                  onPress={() => setImageUri(sel ? null : uri)}
                  style={[styles.photoRing, sel && styles.photoRingOn]}
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={tr("Photo")}
                >
                  <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.toolbar}>
          <ToolButton icon="reorder-three-outline" label={tr("Message")} on={bodyOn} onPress={toggleBody} />
          <ToolButton icon="image-outline" label={tr("Image")} on={hasImage} onPress={() => setPickOn((v) => !v)} />
          <View style={{ flex: 1 }} />
          <Text style={styles.counter}>
            {title.length}/{TITLE_MAX}
          </Text>
          {/* Clavier ouvert : le bouton ferme le clavier (flèche vers le bas) ;
              clavier fermé : il envoie (flèche vers le haut). */}
          {keyboardOpen ? (
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={[styles.send, { backgroundColor: BC.ink }]}
              accessibilityLabel={tr("Fermer le clavier")}
            >
              <Ionicons name="arrow-down" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={submit}
              disabled={!canSend}
              style={[styles.send, { backgroundColor: canSend ? BC.ink : "#E5E5EA" }]}
              accessibilityLabel={tr("Envoyer")}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color={canSend ? "#fff" : "#8A8A90"} />
              )}
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const ToolButton = ({
  icon,
  label,
  on,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  on: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.tool, on && { backgroundColor: BC.accentTint }]}
    accessibilityLabel={label}
    accessibilityState={{ selected: on }}
  >
    <Ionicons name={icon} size={20} color={on ? BC.accentInk : BC.muted} />
  </Pressable>
);

const styles = StyleSheet.create({
  layer: { zIndex: 1001, elevation: 1001 },
  backdrop: { backgroundColor: "rgba(20,20,22,0.34)" },
  card: {
    position: "absolute",
    left: 10,
    right: 10,
    gap: 14,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderRadius: 28,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BC.surface,
  },
  titleInput: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
    color: BC.ink,
  },
  bodyInput: {
    maxHeight: 88,
    paddingHorizontal: 4,
    paddingVertical: 0,
    fontSize: 15,
    lineHeight: 21,
    color: "#3A3A3C",
    textAlignVertical: "top",
  },
  strip: { gap: 10, paddingHorizontal: 2, paddingVertical: 2 },
  galleryTile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BC.surface,
  },
  photoRing: { padding: 2, borderRadius: 18, borderWidth: 2, borderColor: "transparent" },
  photoRingOn: { borderColor: BC.accent },
  photo: { width: 52, height: 52, borderRadius: 13, backgroundColor: "#E5E5EA" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BC.line,
  },
  tool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: { fontSize: 11, color: BC.muted, fontVariant: ["tabular-nums"] },
  send: {
    width: 48,
    height: 48,
    marginLeft: 10,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
