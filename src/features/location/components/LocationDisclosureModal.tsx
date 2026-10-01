import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { DS } from "@/src/theme/ds";

import {
  LocationPurpose,
  onLocationDisclosureRequest,
} from "../services/locationPermission";

/**
 * Écran de divulgation affiché JUSTE AVANT la popup système de localisation
 * (Android, exigence Google Play « divulgation bien visible et
 * consentement »). COPIE DÉDIÉE (R16) du dialogue centré de `LogoutModal` :
 * voile, carte blanche, pastille d'icône, deux boutons. Écarts : couleurs `DS`,
 * texte selon le contexte de la demande.
 *
 * `<Modal>` (et non une carte à la racine) : la demande peut venir d'une sheet
 * déjà ouverte en `<Modal>` (adresse de livraison), qu'une simple vue
 * resterait sous. Monté une seule fois à la racine (`app/_layout.tsx`), il
 * répond aux demandes de `requestForegroundLocation`.
 */

type Disclosure = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
};

/** Quelle donnée, pourquoi, avec qui : contenu exigé par Google Play. */
const DISCLOSURES: Record<LocationPurpose, Disclosure> = {
  nearby: {
    icon: "location",
    title: "Votre position, pour les boutiques proches",
    message:
      "Yaammoo collecte la position de votre téléphone lorsque vous utilisez l'application, pour afficher les boutiques proches de vous et leur distance, et vous envoyer les offres des boutiques de votre ville. Elle est enregistrée sur nos serveurs et n'est pas collectée quand l'application est fermée.",
  },
  address: {
    icon: "navigate",
    title: "Votre position, pour la livraison",
    message:
      "Yaammoo utilise la position actuelle de votre téléphone pour remplir l'adresse de livraison de cette commande. Elle est transmise à la boutique et au livreur pour vous livrer.",
  },
  shop: {
    icon: "storefront",
    title: "Position de votre boutique",
    message:
      "Yaammoo utilise la position actuelle de votre téléphone pour enregistrer l'emplacement de votre boutique. Les clients voient la distance qui les sépare de votre boutique.",
  },
  delivery: {
    icon: "bicycle",
    title: "Partage de votre position pendant la livraison",
    message:
      "Pendant vos courses, Yaammoo collecte votre position, y compris quand l'application est en arrière-plan ou l'écran éteint, et la partage en temps réel avec le client pour qu'il suive sa commande. Une notification reste affichée tant que le partage est actif ; il s'arrête à la fin de la course.",
  },
};

const SETTINGS_NOTE =
  "Vous pourrez changer ce choix à tout moment dans les réglages du téléphone.";

export const LocationDisclosureModal = () => {
  const [purpose, setPurpose] = useState<LocationPurpose | null>(null);
  const answerRef = useRef<((accepted: boolean) => void) | null>(null);

  /** Ferme l'écran puis transmet le choix (la popup système suit). */
  const answer = useCallback((accepted: boolean) => {
    const reply = answerRef.current;
    answerRef.current = null;
    setPurpose(null);
    reply?.(accepted);
  }, []);

  useEffect(() => {
    const unsubscribe = onLocationDisclosureRequest((next, reply) => {
      answerRef.current = reply;
      setPurpose(next);
    });
    return () => {
      unsubscribe();
      // Démonté en attente : on ne bloque pas l'appelant.
      answerRef.current?.(false);
      answerRef.current = null;
    };
  }, []);

  const content = purpose ? DISCLOSURES[purpose] : null;

  return (
    <Modal
      visible={!!content}
      transparent
      animationType="fade"
      // Retour Android = pas de consentement.
      onRequestClose={() => answer(false)}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop}>
        {content && (
          <View style={styles.card} accessibilityRole="alert">
            <View style={styles.iconWrap}>
              <Ionicons name={content.icon} size={28} color={DS.accent} />
            </View>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.message}>{content.message}</Text>
            <Text style={styles.note}>{SETTINGS_NOTE}</Text>

            <View style={styles.actions}>
              <Pressable
                onPress={() => answer(false)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnLater,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnLaterText}>Non merci</Text>
              </Pressable>
              <Pressable
                onPress={() => answer(true)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnContinue,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnContinueText}>Continuer</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: DS.backdrop,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: DS.bg,
    borderRadius: 22,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 16,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: DS.accentWash,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: DS.ink,
    textAlign: "center",
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: DS.text2,
    marginBottom: 10,
  },
  note: {
    fontSize: 12.5,
    lineHeight: 18,
    color: DS.muted,
    marginBottom: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnLater: {
    backgroundColor: DS.surface,
  },
  btnLaterText: {
    fontSize: 15,
    fontWeight: "600",
    color: DS.text2,
  },
  btnContinue: {
    backgroundColor: DS.accent,
  },
  btnContinueText: {
    fontSize: 15,
    fontWeight: "700",
    color: DS.onInk,
  },
  pressed: {
    opacity: 0.7,
  },
});
