import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusEligibility } from "../hooks/useBonusEligibility";
import type {
  Bonus,
  BonusClaimStatus,
  BonusRequestStatus,
} from "../types/bonus.types";
import { BonusGlassCard, GLASS_BORDER } from "./BonusGlassCard";
import { USE_IMAGE_BG } from "./BonusPageBackground";
import { BonusProgressBar } from "./BonusProgressBar";
import { BonusSparkline } from "./BonusSparkline";

interface BonusCardProps {
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
  /** Image de fond de la carte principale (URI locale). null = asset par défaut. */
  cardImage?: string | null;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
const numOrDash = (n?: number) => (typeof n === "number" ? fmt(n) : "—");

const DARK = Theme.colors.dark;
const GRAY = Theme.colors.gray[600];
const GRAY_L = Theme.colors.gray[400];
const LIGHT = "#ffffff";
// Glassmorphism : c'est BonusGlassCard qui porte le fond (blur + blanc très
// translucide). Les cartes elles-mêmes ne peignent plus rien, sinon l'aplat
// masquerait le verre. `USE_IMAGE_BG` = false rétablit l'aplat gris d'origine.
const CARD_BG = USE_IMAGE_BG ? "transparent" : Theme.colors.gray[100];
// Pistes de progression : assombries sur fond image, sinon elles s'y noient.
const TRACK = USE_IMAGE_BG ? "rgba(0,0,0,0.16)" : Theme.colors.gray[200];
// Liseré : sur verre, une arête CLAIRE (et non sombre) fait l'effet de vitre.
const BORDER = USE_IMAGE_BG ? GLASS_BORDER : "rgba(0,0,0,0.01)";

// ── Alignement optique sur le header ──
// Le TabHeader pose son texte à `Theme.spacing.md` (16) du bord. Pour que le
// TEXTE des cartes tombe sur la même verticale, chaque carte est décalée de
// GUTTER MOINS son propre padding interne : marge + padding = 16.
const GUTTER = Theme.spacing.md;
const CARD_PAD = 10;
const CLAIM_PAD = 12;
const MINI_PAD = 10;

/** Titre principal de la carte : l'émetteur du bonus (fastfood ou yaammoo). */
const issuerText = (bonus: Bonus): string => bonus.fastFoodName || "yaammoo";

/** Suffixe de période affiché après le compteur : "sur le mois", etc. */
const PERIOD_LABEL: Record<string, string> = {
  day: "sur le jour",
  week: "sur la semaine",
  month: "sur le mois",
};

/** Formate une date ISO en "12 juil.", ou "—" si absente/invalide. */
const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

/** Infos d'utilisation du code (faites / restantes) si un plafond est défini. */
const usageInfo = (bonus: Bonus) => {
  if (typeof bonus.usageLimit !== "number") return null;
  const used = bonus.usageCount ?? 0;
  return {
    used,
    limit: bonus.usageLimit,
    // Le backend fait autorité sur le reste ; sinon on le déduit.
    remaining: bonus.remainingUses ?? Math.max(0, bonus.usageLimit - used),
  };
};

/**
 * Date de fin du code : `expiresAt` fourni par le backend. Fallback sur
 * `claimedAt + claimDuration` si absent. "—" si pas encore réclamé.
 */
const fmtEndDate = (bonus: Bonus) => {
  if (bonus.expiresAt) return fmtDate(bonus.expiresAt);
  if (!bonus.claimedAt || !bonus.claimDuration) return "—";
  const d = new Date(bonus.claimedAt);
  if (isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + bonus.claimDuration);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

/** Texte de durée : "N j" ou "N mois". */
const durationText = (bonus: Bonus) => {
  if (!bonus.claimDuration) return "—";
  const d = bonus.claimDuration;
  if (d < 31) return `${d} j`;
  return `${Math.round(d / 30)} mois`;
};

/**
 * Design V2 des bonus : identique à V3 (minimaliste / épuré, cartes blanches,
 * couleur du bonus en accent). Différence gérée par UserBonusModal : la page V2
 * a un fond global BLANC PUR (alors que V3 est sur fond gris neutre).
 */
export const BonusCard: React.FC<BonusCardProps> = ({
  bonus,
  claimStatus = "idle",
  onClaim,
  cardImage,
}) => {
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusEligibility(bonus);
  const periodLabel = bonus.criteria?.period
    ? PERIOD_LABEL[bonus.criteria.period]
    : "";

  const reqStatus: BonusRequestStatus =
    claimStatus === "pending" ? "pending" : (bonus.requestStatus ?? "none");

  // ── Détermination de l'état effectif du bonus ──
  const isInactive = bonus.active === false;
  const isRedeemed = bonus.redeemed === true;
  const isPending = reqStatus === "pending";
  const isApproved = reqStatus === "approved";
  const isEligible =
    !isInactive && !isRedeemed && reqStatus === "none" && p.eligible;

  const u = usageInfo(bonus);

  const statusText = isInactive
    ? "Inactif"
    : isRedeemed
      ? u
        ? `Utilisé ${u.used}/${u.limit}`
        : "Utilisé"
      : isApproved
        ? "Validé"
        : isPending
          ? "En attente"
          : isEligible
            ? "Éligible"
            : "Non éligible";

  // Couleur associée au statut (chip + icône de réclamation) — 1 couleur par état.
  const statusColor = (): string => {
    if (isInactive) return "#6366f1"; // indigo — offre non activée
    if (isRedeemed) return "#8b5cf6"; // violet — utilisé
    if (isApproved) return "#16a34a"; // vert — validé
    if (isPending) return "#f59e0b"; // orange — en attente
    if (isEligible) return d.color; // couleur du bonus — éligible
    return "#ef4444"; // rouge — non éligible
  };
  const proposed = bonus.fastFoodBonusCount;
  const mine = bonus.userClaimedCount;
  const total = bonus.totalClaimedCount;
  const max = Math.max(proposed ?? 0, mine ?? 0, total ?? 0, 1);

  const bs = bonus.bonusStats;

  return (
    <View style={styles.root}>
      {/* Stats du bonus (Commandes / Montant) */}
      {bs ? <StatsPanel stats={bs} color={d.color} /> : null}

      {/* Carte principale — seule carte à porter l'image de fond, en plus du
          verre : c'est elle qui doit se détacher des autres blocs. */}
      <BonusGlassCard
        style={styles.card}
        radius={24}
        image
        imageUri={cardImage}
      >
        <View style={styles.top}>
          <View style={styles.issuerBlock}>
            <Text style={styles.issuerValue} numberOfLines={1}>
              {issuerText(bonus)}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: `${statusColor()}1f` },
            ]}
          >
            <Text style={[styles.statusPillText, { color: statusColor() }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {bonus.name}
        </Text>
        {!!bonus.description && (
          <Text style={styles.description} numberOfLines={2}>
            {bonus.description}
          </Text>
        )}

        <View style={styles.progressWrap}>
          <BonusProgressBar
            progress={p.measurable ? p.progress : 1}
            color={d.color}
            // Plus foncé que CARD_BG, sinon la piste disparaît sur le fond gris.
            trackColor={TRACK}
          />
          {p.measurable && p.target > 0 && (
            <Text style={styles.progressText}>
              {p.unit === "FCFA"
                ? `${fmt(p.current)} / ${fmt(p.target)} FCFA`
                : `${p.current} / ${p.target} commandes payées`}
              {periodLabel ? ` · ${periodLabel}` : ""}
            </Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Info label="Début" value={fmtDate(bonus.claimedAt)} />
          <Info label="Fin" value={fmtEndDate(bonus)} />
          <Info label="Durée" value={durationText(bonus)} />
        </View>
      </BonusGlassCard>

      {/* Mini-cartes stats (sparkline + barre) */}
      <View style={styles.miniRow}>
        <MiniStat
          color={d.color}
          variant={0}
          title="Proposés"
          sub="par le fastfood"
          value={numOrDash(proposed)}
          ratio={(proposed ?? 0) / max}
        />
        <MiniStat
          color={d.color}
          variant={1}
          title="Mes reçus"
          sub="sur ce bonus"
          value={numOrDash(mine)}
          ratio={(mine ?? 0) / max}
        />
        <MiniStat
          color={d.color}
          variant={2}
          title="Distribués"
          sub="tous les users"
          value={numOrDash(total)}
          ratio={(total ?? 0) / max}
        />
      </View>
    </View>
  );
};

/** Panneau stats propre à ce bonus (Commandes / Montant) */
const StatsPanel = ({
  stats,
  color,
}: {
  stats: NonNullable<Bonus["bonusStats"]>;
  color: string;
}) => {
  return (
    <View style={stylesStats.row}>
      <BonusGlassCard
        style={[stylesStats.block, stylesStats.blockOrders]}
        radius={16}
      >
        <View style={[stylesStats.head, stylesStats.headStart]}>
          <Ionicons name="receipt-outline" size={14} color={color} />
          <Text style={stylesStats.title}>Commandes</Text>
        </View>
        <View style={stylesStats.cells}>
          {/* Première colonne calée à gauche : son texte tombe sur la même
                verticale que le header et les autres cartes. */}
          <View style={[stylesStats.cell, stylesStats.cellStart]}>
            <Text style={[stylesStats.cellValue, { color }]}>
              {stats.day.count}
            </Text>
            <Text style={stylesStats.cellKey}>Jour</Text>
          </View>
          <View style={stylesStats.cell}>
            <Text style={[stylesStats.cellValue, { color }]}>
              {stats.week.count}
            </Text>
            <Text style={stylesStats.cellKey}>Sem.</Text>
          </View>
          <View style={stylesStats.cell}>
            <Text style={[stylesStats.cellValue, { color }]}>
              {stats.month.count}
            </Text>
            <Text style={stylesStats.cellKey}>Mois</Text>
          </View>
        </View>
      </BonusGlassCard>
      <BonusGlassCard
        style={[stylesStats.block, stylesStats.blockAmount]}
        radius={16}
      >
        <View style={stylesStats.head}>
          <Ionicons name="cash-outline" size={14} color={color} />
          <Text style={stylesStats.title}>Montant</Text>
        </View>
        <View style={stylesStats.cells}>
          <View style={stylesStats.cell}>
            <Text style={[stylesStats.cellValue, { color }]}>
              {fmtK(stats.day.amount)}
            </Text>
            <Text style={stylesStats.cellKey}>Jour</Text>
          </View>
          <View style={stylesStats.cell}>
            <Text style={[stylesStats.cellValue, { color }]}>
              {fmtK(stats.week.amount)}
            </Text>
            <Text style={stylesStats.cellKey}>Sem.</Text>
          </View>
          {/* Dernière colonne calée à droite : symétrique de la première. */}
          <View style={[stylesStats.cell, stylesStats.cellEnd]}>
            <Text style={[stylesStats.cellValue, { color }]}>
              {fmtK(stats.month.amount)}
            </Text>
            <Text style={stylesStats.cellKey}>Mois</Text>
          </View>
        </View>
      </BonusGlassCard>
    </View>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.info}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const MiniStat = ({
  color,
  variant,
  title,
  sub,
  value,
  ratio,
}: {
  color: string;
  variant: number;
  title: string;
  sub: string;
  value: string;
  ratio: number;
}) => (
  <BonusGlassCard style={styles.mini} radius={16}>
    <Text style={styles.miniTitle} numberOfLines={1}>
      {title}
    </Text>
    <Text style={styles.miniSub} numberOfLines={1}>
      {sub}
    </Text>
    <View style={styles.miniChart}>
      <BonusSparkline color={color} variant={variant} height={34} />
    </View>
    <View style={styles.miniBottom}>
      <View style={styles.miniBar}>
        <View
          style={[
            styles.miniBarFill,
            {
              width: `${Math.max(6, Math.min(100, ratio * 100))}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  </BonusGlassCard>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-around",
  },

  card: {
    // marge + paddingHorizontal = GUTTER → le texte s'aligne sur le header.
    marginHorizontal: GUTTER - CARD_PAD,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: CARD_PAD,
    gap: 10,
    borderWidth: USE_IMAGE_BG ? 1 : 0.5,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  issuerBlock: { flex: 1 },
  issuerValue: { color: DARK, fontSize: 24, fontWeight: "800", marginTop: 2 },
  statusPill: {
    backgroundColor: DARK,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
  },
  statusPillText: { color: LIGHT, fontSize: 12, fontWeight: "700" },
  name: { color: DARK, fontSize: 16, fontWeight: "700", marginTop: -2 },
  description: { color: GRAY, fontSize: 13, lineHeight: 18, marginTop: -6 },
  progressWrap: { gap: 6 },
  progressText: { color: GRAY, fontSize: 12, fontWeight: "500" },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  info: { flex: 1 },
  infoLabel: { color: GRAY, fontSize: 12, fontWeight: "500" },
  infoValue: { color: DARK, fontSize: 16, fontWeight: "800", marginTop: 2 },
  miniRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: GUTTER - MINI_PAD,
  },
  mini: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: MINI_PAD,
    gap: 2,
    borderWidth: USE_IMAGE_BG ? 1 : 0.5,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  miniTitle: { color: DARK, fontSize: 13, fontWeight: "700" },
  miniSub: { color: GRAY_L, fontSize: 10, fontWeight: "500" },
  miniChart: { height: 34, marginVertical: 4 },
  miniBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    // Plus foncé que CARD_BG (gray[100]), sinon la piste s'y confond.
    backgroundColor: TRACK,
    overflow: "hidden",
  },
  miniBarFill: { height: "100%", borderRadius: 3 },
  miniValue: { color: DARK, fontSize: 13, fontWeight: "800" },

  // Ligne de réclamation : 2 cartes distinctes (infos à gauche, action à droite).
  // Variante identifiants : le verre porte l'apparence de la carte, le
  // Touchable interne se contente de la disposition + de la zone de tap.
});

// Styles du panneau stats propre à chaque bonus
const stylesStats = StyleSheet.create({
  // Les deux blocs sont des cartes autonomes (comme les mini-cartes de la ligne
  // 3) : pas de carte englobante, sinon un niveau d'imbrication de plus ajoute
  // son propre padding et casse le rythme vertical des autres lignes.
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    marginHorizontal: GUTTER - MINI_PAD,
    gap: 10,
  },
  block: {
    gap: 4,
    padding: MINI_PAD,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: USE_IMAGE_BG ? 1 : 0.5,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  // Commandes : 2 colonnes → moins large. Montant : 3 colonnes (Jour/Sem./Mois)
  // et des valeurs plus longues ("19,1k") → part plus généreuse.
  blockOrders: { flex: 4 },
  blockAmount: { flex: 5 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // Les deux titres commencent à gauche, au-dessus de leur 1re colonne.
    justifyContent: "flex-start",
  },
  headStart: { justifyContent: "flex-start" },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cells: {
    flexDirection: "row",
    marginTop: 4,
    // Espaces égaux entre colonnes (et non des tiers centrés) : les valeurs
    // respirent de la même façon quel que soit le nombre de colonnes.
    justifyContent: "space-between",
  },
  cell: { alignItems: "flex-start" },
  // Colonnes extrêmes : calées sur leur bord (et non centrées dans leur tiers)
  // pour tomber sur la verticale de texte commune aux autres cartes.
  cellStart: { alignItems: "flex-start" },
  cellEnd: { alignItems: "flex-end" },
  cellValue: { fontSize: 18, fontWeight: "800", color: DARK },
  cellKey: { fontSize: 10, color: GRAY, marginTop: 1 },
});
