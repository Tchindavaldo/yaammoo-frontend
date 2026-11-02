import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import { MenuDraft, namedItems, validPrices } from "./MenuDraft.types";
import { t } from "@/src/i18n";

const ORANGE = Theme.colors.primary;

/**
 * Design 1 — Combo (orange chaleureux).
 * Carte food app : vignette ronde + nom + statut sur un bandeau orange dégradé,
 * gros prix d'entrée à droite, puis trois "tuiles combo" teintées orange
 * (photos / extras / nombre de prix) et une barre stock. Brèveté totale : compteurs
 * + 2 noms résumés, jamais de liste.
 */
export const MenuRecapDesign1: React.FC<{ draft: MenuDraft }> = ({ draft }) => {
  const extras = namedItems(draft.extras);
  const prices = validPrices(draft);
  // N prix : 3 tuiles max, la 3e résume le reste (« +N »).
  const shownPrices = prices.length > 3 ? prices.slice(0, 2) : prices;
  const cover = draft.images[0];
  const isAvailable = draft.availability === "available";

  return (
    <View style={styles.wrap}>
      {/* Bandeau orange dégradé */}
      <LinearGradient
        colors={[ORANGE, "#ff7a3d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.avatar}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
            />
          ) : (
            <Ionicons name="fast-food" size={28} color="rgba(255,255,255,0.9)" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>
            {draft.nom || t("Sans nom")}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isAvailable ? "#aef5d2" : "#ffd0d0" },
              ]}
            />
            <Text style={styles.statusText}>
              {isAvailable ? t("Disponible") : t("Indisponible")}
            </Text>
            {draft.images.length > 1 && (
              <>
                <Text style={styles.statusSep}>·</Text>
                <Ionicons name="images" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statusText}>{draft.images.length}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.stockBox}>
          <Text style={styles.stockBoxNum}>{Number(draft.stock) || 0}</Text>
          <Text style={styles.stockBoxLabel}>{t("en stock")}</Text>
        </View>
      </LinearGradient>

      {/* Ligne 1 — les prix (N), même structure que la ligne combo */}
      <Text style={styles.sectionLabel}>{t("Prix")}</Text>
      <View style={styles.tilesNoTop}>
        {shownPrices.map((p, i) => (
          <Tile
            key={i}
            icon="pricetag"
            count=""
            title={`${p.price}F`}
            sub={p.description || "—"}
          />
        ))}
        {prices.length > 3 && (
          <Tile
            icon="pricetags"
            count=""
            title={`+${prices.length - 2}`}
            sub={brief(prices.slice(2).map((p) => `${p.price}F`))}
          />
        )}
      </View>

      {/* Ligne 2 — combo photos / extras / prix (les boissons sont gérées par la boutique) */}
      <Text style={styles.sectionLabel}>{t("Détails")}</Text>
      <View style={styles.tilesNoTop}>
        <Tile
          icon="images"
          count={draft.images.length}
          title={t("Photos")}
          sub={draft.images.length > 0 ? t("ajoutées") : t("aucune")}
        />
        <Tile icon="add-circle" count={extras.length} title="Extras" sub={brief(extras.map((e) => e.name))} />
        <Tile icon="pricetag" count={prices.length} title={t("Prix")} sub={brief(prices.map((p) => p.description).filter(Boolean))} />
      </View>
    </View>
  );
};

const brief = (items: string[], max = 2): string => {
  if (items.length === 0) return "—";
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest}` : "");
};

const Tile: React.FC<{
  icon: string;
  count: number | string;
  title: string;
  sub: string;
}> = ({ icon, count, title, sub }) => (
  <View style={styles.tile}>
    <View style={styles.tileHead}>
      <Ionicons name={icon as any} size={15} color={ORANGE} />
      <Text style={styles.tileCount}>{count}</Text>
    </View>
    <Text style={styles.tileTitle}>{title}</Text>
    <Text style={styles.tileSub} numberOfLines={1}>
      {sub}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { paddingBottom: Theme.spacing.lg },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  name: { fontSize: 20, fontWeight: "900", color: "white", letterSpacing: -0.3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.95)" },
  statusSep: { color: "rgba(255,255,255,0.6)", fontWeight: "900" },
  // Bloc stock sur le hero (chiffre en haut, texte en bas)
  stockBox: { alignItems: "center" },
  stockBoxNum: { fontSize: 30, fontWeight: "900", color: "white", lineHeight: 32 },
  stockBoxLabel: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.9)" },
  // Tuiles
  tiles: { flexDirection: "row", gap: 8, marginTop: Theme.spacing.md },
  tilesNoTop: { flexDirection: "row", gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: Theme.colors.gray[600],
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  tile: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: ORANGE + "10",
    borderWidth: 1,
    borderColor: ORANGE + "22",
  },
  tileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileCount: { fontSize: 20, fontWeight: "900", color: ORANGE },
  tileTitle: { fontSize: 12, fontWeight: "800", color: Theme.colors.dark, marginTop: 6 },
  tileSub: { fontSize: 11, fontWeight: "600", color: Theme.colors.gray[500], marginTop: 2 },
});
