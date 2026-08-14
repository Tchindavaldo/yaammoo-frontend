import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CartZoneGroup } from "../utils/groupCartOrders";

interface CartZoneFooterBarProps {
  /** Groupes actuellement affichés : un seul si une zone est isolée. */
  groups: CartZoneGroup[];
  /** Paie les groupes affichés. Sans cette prop, pas de bouton. */
  onPay?: (groups: CartZoneGroup[]) => void;
  /**
   * Rend l'en-tête SUR LA MÊME LIGNE que les colonnes, au bord droit, et sur
   * deux lignes : type de livraison + heure au-dessus, zone dessous. Inverse
   * aussi l'ordre des colonnes (libellé au-dessus de son montant). Utilisé par
   * le sheet de paiement ; le récap fixe du panier garde l'en-tête au-dessus.
   */
  inlineHeader?: boolean;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F`;

/**
 * Récap du panier, sorti des cards de `CartZoneTable` et rendu FIXE juste
 * au-dessus de la barre de chips du bas (`cart.tsx`).
 *
 * Il agrège les groupes affichés : quand une zone est isolée par les chips de
 * zone, il ne décrit que cette zone ; sinon il totalise tout ce qui est visible.
 */
export const CartZoneFooterBar: React.FC<CartZoneFooterBarProps> = ({
  groups,
  onPay,
  inlineHeader = false,
}) => {
  if (groups.length === 0) return null;

  const cmd = groups.reduce((s, g) => s + g.entries.length, 0);
  const articles = groups.reduce((s, g) => s + g.articles, 0);
  const livraison = groups.reduce((s, g) => s + g.livraison, 0);
  const total = groups.reduce((s, g) => s + g.total, 0);
  /**
   * Retrait en boutique : `livraison` vaut 0 parce qu'il n'y a AUCUNE course a
   * facturer, pas parce qu'elle est offerte. Les deux cas partagent le meme
   * montant nul, donc on distingue via le type — sinon "0 F" s'affichait
   * "Offerte" comme un vrai bonus livraison.
   */
  const isPickupOnly = groups.every((g) => g.type !== "express" && g.type !== "time");

  /**
   * En-tete : `LIVRAISON · ZONE · HEURE` (ou `· EXPRESS` a la place de l'heure
   * quand la course est immediate). Quand plusieurs groupes sont visibles, seul
   * le nombre de zones est annonce : leurs valeurs different.
   */
  const headerParts = (() => {
    if (groups.length > 1)
      return { mode: "ZONES", zone: `${groups.length} zones` };
    const g = groups[0];
    if (g.type !== "express" && g.type !== "time")
      return { mode: "SUR PLACE", zone: g.zone.toUpperCase() };
    return {
      mode: ["LIVRAISON", g.type === "express" ? "EXPRESS" : g.heure]
        .filter(Boolean)
        .join(" · "),
      zone: g.zone.toUpperCase(),
    };
  })();

  /** Variante par defaut : tout sur une ligne. */
  const header = [headerParts.mode, headerParts.zone]
    .filter(Boolean)
    .join(" · ");

  /**
   * Sens d'empilement des colonnes. Le recap fixe du panier met le montant
   * au-dessus de son libelle ; le sheet de paiement (`inlineHeader`) inverse.
   */
  const colDirection: "column" | "column-reverse" = inlineHeader
    ? "column-reverse"
    : "column";

  return (
    <View style={styles.bar}>
      {/* Meme voile floute que la barre de chips du bas. */}
      <BlurView
        intensity={40}
        tint="light"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* En-tete sur UNE ligne, AU-DESSUS des colonnes (disposition par defaut,
          celle du recap fixe du panier). */}
      {!inlineHeader && (
        <View style={styles.headerRow}>
          <Text style={styles.headerText} numberOfLines={1}>
            {header}
          </Text>
        </View>
      )}

      <View style={styles.mainRow}>
        {/* Colonnes de recap : LIVRAISON, N CMD, TOTAL. Le MONTANT est au-dessus
            et le libelle dessous, les styles gardant leur role (footLabel
            discret, footValue mis en avant). */}
        <View style={styles.cols}>
          {/* Dans le sheet de paiement (`inlineHeader`), l'ordre est INVERSE :
              le libelle passe au-dessus de son montant. */}
          <View style={{ gap: 3, flexDirection: colDirection }}>
            <Text
              style={[
                footValue,
                livraison > 0
                  ? { color: "#ec4913" }
                  : isPickupOnly
                    ? undefined
                    : { color: "#16a34a", fontSize: 11 },
              ]}
            >
              {livraison > 0 ? fmt(livraison) : isPickupOnly ? "0 F" : "Offerte"}
            </Text>
            <Text style={footLabel}>COURSE</Text>
          </View>
          <View style={styles.sep} />

          <View style={{ gap: 3, flexDirection: colDirection }}>
            <Text style={footValue}>{fmt(articles)}</Text>
            <Text style={footLabel}>{cmd} CMD</Text>
          </View>

          <View style={styles.sep} />

          <View style={{ gap: 3, flexDirection: colDirection }}>
            <Text style={footValue}>{fmt(total)}</Text>
            <Text style={footLabel}>TOTAL</Text>
          </View>
        </View>

        {/* Variante inline : l'en-tete vit sur la MEME ligne que les colonnes,
            au bord droit, sur deux lignes — mode + heure au-dessus, zone
            dessous. */}
        {inlineHeader && (
          <View style={styles.inlineHeader}>
            <Text
              style={[styles.headerText, { flex: 0, textAlign: "right" }]}
              numberOfLines={1}
            >
              {headerParts.mode}
            </Text>
            <Text style={styles.inlineZone} numberOfLines={1}>
              {headerParts.zone}
            </Text>
          </View>
        )}

        {/* Bouton de paiement, a la place laissee par le total. */}
        {onPay && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPay(groups)}
            style={styles.payBtn}
          >
            <Ionicons name="card-outline" size={14} color="#fff" />
            <Text style={styles.payText}>commander</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    // Voile clair par-dessus le blur, comme `filterBottomBar`.
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  // Ligne principale : colonnes de recap + bouton de paiement.
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  // En-tete : zone + type de livraison + heure.
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 10,
  },
  // Variante inline : bloc cale au bord droit de la ligne des colonnes.
  inlineHeader: {
    alignItems: "flex-end",
    gap: 3,
    paddingRight: 10,
    maxWidth: 150,
  },
  inlineZone: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.4,
  },
  headerText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.6,
  },
  cols: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  sep: {
    width: 1,
    height: 26,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 14,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0f172a",
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
  },
  payText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});

// Libelle discret (petites capitales espacees), valeur mise en avant dessous.
const footLabel = {
  fontSize: 10,
  fontWeight: "700" as const,
  color: "#94a3b8",
  letterSpacing: 0.6,
};

const footValue = {
  fontSize: 13,
  fontWeight: "bold" as const,
  color: "#0f172a",
};
