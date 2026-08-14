import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { computeEligibility } from "../hooks/useBonusEligibility";
import type { Bonus } from "../types/bonus.types";
import { CAROUSEL_INTERVAL } from "./BonusCarousel";

/**
 * Libellé + couleur d'un bonus, en fonction PURE (pas un hook) : `TextSlide`
 * est rendu dans une boucle `.map`, où `useBonusStatus` (hook) est interdit.
 * Reprend exactement la même dérivation que `useBonusStatus` — dupliquée ici
 * plutôt que d'ajouter une variante au hook partagé (R16) — mais s'appuie sur
 * la même fonction pure `computeEligibility` pour ne pas diverger du calcul
 * d'éligibilité réel.
 */
const statusOf = (bonus: Bonus) => {
  const d = getBonusDescriptor(bonus.type);
  const p = computeEligibility(bonus);
  const reqStatus = bonus.requestStatus ?? "none";
  const isInactive = bonus.active === false;
  const isRedeemed = bonus.redeemed === true;
  const isPending = reqStatus === "pending";
  const isApproved = reqStatus === "approved";
  const isEligible =
    !isInactive && !isRedeemed && reqStatus === "none" && p.eligible;
  const label = isInactive
    ? "Inactif"
    : isRedeemed
      ? "Utilisé"
      : isApproved
        ? "Validé"
        : isPending
          ? "En attente"
          : isEligible
            ? "Éligible"
            : "Non éligible";
  return { label, color: d.color };
};

interface BonusPagerInfoProps {
  bonuses: Bonus[];
  scrollX: Animated.Value;
  /** Couleur des points de pagination. */
  dotColor: string;
}

const PANEL_W = 168;

/** Utilisations restantes si un plafond est défini, sinon null. */
const remainingUses = (bonus?: Bonus): number | null => {
  if (!bonus || typeof bonus.usageLimit !== "number") return null;
  const used = bonus.usageCount ?? 0;
  return bonus.remainingUses ?? Math.max(0, bonus.usageLimit - used);
};

/**
 * Colonne droite de la carte de pagination — bloc « héro » du bonus courant.
 *
 * Parti pris : un numéro géant en filigrane ancre le panneau ; le contenu
 * (icône + nom + statut) se pose par-dessus, calé en bas. La pagination n'est
 * plus des points scolaires mais une JAUGE horizontale dont la portion pleine
 * suit le scroll — elle dit « où on en est » dans la pile de bonus.
 *
 * **Texte = vrai carrousel**, même principe que `BonusCarousel` (carte du
 * haut) : une PISTE contenant un slide par bonus, large de `bonuses.length *
 * PANEL_W`, translatée en un seul bloc via `scrollX`. Pas de fondu, pas de
 * calcul de voisin — le slide N+1 est physiquement à côté du slide N et entre
 * dans le cadre au même rythme que celui-ci en sort, comme un scroll normal.
 */
export const BonusPagerInfo = ({
  bonuses,
  scrollX,
  dotColor,
}: BonusPagerInfoProps) => {
  // Translation de la PISTE de texte : `scrollX` (0..N-1 en unités de
  // CAROUSEL_INTERVAL) est ramené à l'échelle de la piste (0..N-1 en unités
  // de PANEL_W), puis inversé — la piste glisse dans le sens opposé au doigt,
  // exactement comme un ScrollView natif.
  const trackTranslateX =
    bonuses.length > 1
      ? scrollX.interpolate({
          inputRange: bonuses.map((_, i) => i * CAROUSEL_INTERVAL),
          outputRange: bonuses.map((_, i) => -i * PANEL_W),
          extrapolate: "clamp",
        })
      : 0;

  return (
    <View style={styles.wrap}>
      {/* Piste : un slide par bonus (numéro + icône + textes + statut),
          translate en bloc — le filigrane glisse donc avec le reste. */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.trackInner,
            { width: bonuses.length * PANEL_W, transform: [{ translateX: trackTranslateX }] },
          ]}
        >
          {bonuses.map((b, i) => (
            <TextSlide
              key={b.id ?? i}
              bonus={b}
              position={i}
              total={bonuses.length}
              dotColor={dotColor}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

/**
 * Un slide de la piste : icône + émetteur + nom + statut d'un seul bonus.
 * AUCUNE interpolation ici, sur AUCUN élément — le slide entier est un bloc
 * 100 % STATIQUE, porté en bloc par la translation unique de la piste
 * (`trackTranslateX`, seule chose animée dans tout `BonusPagerInfo`). Icône,
 * texte et jauge bougeaient chacun selon leur propre interpolation avant
 * cette version : ils semblaient glisser individuellement au lieu de suivre
 * le bloc en un seul mouvement — désormais rien ici ne réagit à `scrollX`.
 */
const TextSlide = ({
  bonus,
  position,
  total,
  dotColor,
}: {
  bonus: Bonus;
  /** Position du bonus dans la liste — alimente le numéro en filigrane. */
  position: number;
  /** Nombre total de bonus — fixe la portion pleine de la jauge (statique). */
  total: number;
  dotColor: string;
}) => {
  const desc = getBonusDescriptor(bonus.type);
  const accent = desc.color;
  const issuer = bonus.fastFoodName || "yaammoo";
  const remaining = remainingUses(bonus);
  const status = statusOf(bonus);
  // Portion pleine de la jauge DE CE bonus, fixe : sa position dans la pile
  // (0 → 100% sur le dernier), plus d'interpolation continue sur scrollX.
  const gaugeWidth =
    total > 1 ? `${Math.round((position / (total - 1)) * 100)}%` : "100%";

  return (
    <View style={styles.slide}>
      {/* Filigrane : le numéro DE CE bonus, ancre son propre slide. */}
      <Text
        style={[styles.ghost, { color: accent }]}
        numberOfLines={1}
        pointerEvents="none"
      >
        {position + 1}
      </Text>

      <View style={styles.topRow}>
        <View style={[styles.iconBadge, { backgroundColor: `${accent}1f` }]}>
          <Ionicons name={desc.icon} size={13} color={accent} />
        </View>
        <View style={styles.topRowText}>
          <Text style={styles.issuer} numberOfLines={1}>
            {issuer}
          </Text>
          {remaining !== null && (
            <Text style={styles.remaining} numberOfLines={1}>
              · {remaining} restante{remaining > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {bonus.name}
      </Text>
      {/* Statut + jauge sur LA MÊME LIGNE, comme dans le design d'origine. */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
          {status.label}
        </Text>
        <View style={styles.gaugeTrack}>
          <View style={[styles.gaugeFill, { width: gaugeWidth, backgroundColor: dotColor }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: PANEL_W, justifyContent: "flex-end", overflow: "hidden" },
  // Numéro géant en filigrane, calé en haut à droite, très basse opacité.
  ghost: {
    position: "absolute",
    top: -18,
    right: -6,
    fontSize: 96,
    fontWeight: "900",
    lineHeight: 96,
    opacity: 0.07,
    letterSpacing: -4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Cadre visible de la piste : largeur d'un panneau, le reste est masqué.
  track: { width: PANEL_W, overflow: "hidden" },
  trackInner: { flexDirection: "row" },
  // Un slide = un panneau plein, mêmes dimensions que l'ancien bloc texte.
  slide: { width: PANEL_W, gap: 6 },
  topRowText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  // flexShrink : un nom de fastfood trop long s'ellipse au lieu de déborder.
  issuer: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.6)",
    flexShrink: 1,
  },
  // Ne rétrécit pas : le compteur « N restantes » reste toujours lisible.
  remaining: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(0,0,0,0.35)",
    flexShrink: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 17,
    color: "rgba(0,0,0,0.82)",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  // flexShrink : le label cède la place à la jauge s'il est long.
  statusText: { fontSize: 11, fontWeight: "800", flexShrink: 1 },
  gaugeTrack: {
    // Prend l'espace restant sur la ligne du statut, à sa droite.
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    // Petite marge gauche pour ne pas coller le label.
    marginLeft: 4,
  },
  gaugeFill: { height: "100%", borderRadius: 2 },
});
