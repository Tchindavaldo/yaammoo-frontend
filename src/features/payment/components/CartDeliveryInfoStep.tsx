"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./CartGroupedDeliverySheet.styles";
import { C } from "./CartPaymentSheet.styles";
import { t, dateLocale, useLanguage } from "@/src/i18n";

interface CartDeliveryInfoStepProps {
  /**
   * Jeu de champs affiche sous le rappel du type :
   * - `where` : lieu de livraison + zone express / creneau horaire ;
   * - `who`   : contact + note vocale.
   * Les deux ecrans partagent exactement le meme gabarit (3 lignes), seule la
   * seconde ligne change.
   */
  part: "where" | "who";
  /** Livraison en cours de composition : pilote l'etat rempli de chaque ligne. */
  delivery: Livraison;
  /** Des zones express existent : la ligne « Zone » n'a de sens que dans ce cas. */
  hasExpressZones: boolean;
  onOpenLocation: () => void;
  onOpenContact: () => void;
  onOpenPeriod: () => void;
  onOpenExpress: () => void;
  onOpenVoiceNote: () => void;
}

/**
 * ETAPE « informations de livraison » du sheet groupe — meme gabarit que les
 * deux etapes precedentes (accroche, cards verticales, bouton principal, lien
 * secondaire), avec une LIGNE PAR INFORMATION a saisir.
 *
 * Copie dediee dans l'esprit de `CartGroupingStep` / `CartDeliveryTypeStep`
 * (R16) : elle remplace la grille compacte de `GroupedDeliveryTab` par des
 * cards pleine largeur, chacune ouvrant son overlay.
 */
export const CartDeliveryInfoStep: React.FC<CartDeliveryInfoStepProps> = ({
  part,
  delivery,
  hasExpressZones,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenExpress,
  onOpenVoiceNote,
}) => {
  useLanguage();
  const isExpress = delivery.type === "express";

  /**
   * Lignes affichees selon le type retenu a l'etape precedente : la zone
   * express et le creneau s'excluent, le reste est commun. Le retrait en
   * boutique (`aucune`) n'a pas de lieu a demander.
   */
  const rows: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    filled: boolean;
    onPress: () => void;
  }[] = [];

  if (part === "where" && delivery.type !== "aucune") {
    rows.push({
      key: "location",
      icon: "location-outline",
      title: t("Lieu de livraison"),
      value: delivery.address || t("Où vous livrer ?"),
      filled: !!(delivery.address || delivery.note),
      onPress: onOpenLocation,
    });
  }

  if (part === "where" && isExpress && hasExpressZones) {
    rows.push({
      key: "express",
      icon: "flash-outline",
      title: t("Zone express"),
      value: delivery.expressLieu || t("Choisir une zone"),
      filled: !!delivery.expressLieu,
      onPress: onOpenExpress,
    });
  }

  if (part === "where" && delivery.type === "standard") {
    rows.push({
      key: "period",
      icon: "time-outline",
      title: t("Créneau horaire"),
      value: delivery.hour ? delivery.hour.split("|").slice(0, 2).join(" · ") : t("Choisir un créneau"),
      filled: !!delivery.hour,
      onPress: onOpenPeriod,
    });
  }

  if (part === "who") {
    rows.push({
      key: "contact",
      icon: "call-outline",
      title: t("Contact"),
      value: delivery.phone || t("Numéro"),
      filled: !!delivery.phone,
      onPress: onOpenContact,
    });

    rows.push({
      key: "note",
      icon: "mic-outline",
      title: t("Note vocale"),
      value: delivery.voiceNoteUri ? t("Enregistrée") : t("Facultatif"),
      filled: !!delivery.voiceNoteUri,
      onPress: onOpenVoiceNote,
    });
  }

  /**
   * Rappel du type retenu a l'etape precedente : premiere ligne, lecture seule.
   *
   * Le titre porte l'HEURE choisie pour un creneau (« Livraison à 13:30 ») et
   * le sous-titre la ZONE retenue pour une livraison express — tant qu'aucune
   * selection n'est faite, on retombe sur un libelle generique.
   */
  const { date: creneauDate, heure: creneauHeure } = (() => {
    const raw = delivery.hour || "";
    if (!raw) return { date: "", heure: "" };
    const parts = raw.split("|");
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]);
    return {
      date: isDate ? parts[0] : "",
      heure: isDate ? parts[1] || "" : parts[0] || "",
    };
  })();

  const typeRow = {
    express: {
      icon: "flash-outline" as const,
      label: t("Livraison express"),
      sub: delivery.expressLieu
        ? t("Zone de livraison · {{a}}", { a: delivery.expressLieu })
        : t("Livré dès que terminée"),
    },
    standard: {
      icon: "time-outline" as const,
      label: creneauHeure ? t("Livraison à {{a}}", { a: creneauHeure }) : t("Livraison à l'heure"),
      sub: creneauDate
        ? t("Créneau du {{a}}", { a: new Date(creneauDate).toLocaleDateString(dateLocale(), {
            weekday: "long",
            day: "numeric",
            month: "long",
          }) })
        : t("Créneau à choisir"),
    },
    aucune: {
      icon: "storefront-outline" as const,
      label: t("Aucune livraison"),
      sub: t("Vous récupérez en boutique"),
    },
  }[(delivery.type || "express") as "express" | "standard" | "aucune"];

  /**
   * TROIS lignes, comme les etapes 1 et 2 : le type choisi en pleine largeur,
   * puis les informations DEUX PAR DEUX. Le nombre de lignes est donc constant
   * et le footer ne se decale jamais.
   */
  return (
    <View style={styles.cards}>
      {/* Ligne 1 — type retenu, non modifiable ici (le bouton de retour du
          footer ramene a l'etape de choix). */}
      <View style={[styles.card, styles.cardActive]}>
        <View style={styles.dot}>
          <Ionicons name={typeRow.icon} size={17} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{typeRow.label}</Text>
          <Text style={styles.cardSub}>{typeRow.sub}</Text>
        </View>
      </View>

      {/* Lignes 2 et 3 — une information par ligne, pleine largeur : chaque
          etape n'en porte plus que deux, le cote a cote n'a plus lieu d'etre. */}
      {rows.map((r) => (
        <TouchableOpacity
          key={r.key}
          style={[styles.card, r.filled && styles.cardActive]}
          onPress={r.onPress}
          activeOpacity={0.85}
        >
          <View style={styles.dot}>
            <Ionicons name={r.icon} size={17} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {r.title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {r.value}
            </Text>
          </View>
          <Ionicons
            name={r.filled ? "checkmark-circle" : "chevron-forward"}
            size={r.filled ? 20 : 17}
            color={r.filled ? C.accent : C.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};
