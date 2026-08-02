import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const CURRENCY = "XAF";

/** Montant articles d'une commande : plat (× qty) + extras + boissons. */
export function computeItemsTotal(order: Commande): number {
  const priceIdx = ((order as any).selectedPriceIndex || 1) - 1;
  const menuPrice =
    order.menu?.prices?.[priceIdx]?.price ||
    order.menu?.prices?.[0]?.price ||
    (order.menu as any)?.prix1 ||
    0;
  let sum = menuPrice * (order.quantity || 1);

  (order.extra || []).forEach((ex: any) => {
    if (
      ex.status === true &&
      ex.name &&
      ex.name !== "Aucun" &&
      ex.name !== "Aucune"
    ) {
      sum += ex.prix || ex.price || 0;
    }
  });
  (order.drink || []).forEach((dr: any) => {
    if (
      dr.status === true &&
      dr.name &&
      dr.name !== "Aucune" &&
      dr.name !== "Aucun"
    ) {
      sum += (dr.prix || dr.price || 0) * (dr.quantite || 1);
    }
  });
  return sum;
}

/** Libellé du mode de livraison d'un groupe : heure (période) ou Express. */
export function deliveryLabel(order: Commande): string {
  const d = order.delivery as any;
  if (d?.status !== true) return "Sur place";
  if (d?.type === "express") return "Express";
  return d?.time || "Période";
}

/**
 * Regroupe des commandes par `deliveryGroupId` (une commande sans groupe forme
 * son propre bloc) et désigne, pour chaque bloc, celle qui porte la facturation
 * de la course (`courseBilled === true`).
 */
export function buildDeliveryGroups(orders: Commande[]): Group[] {
  const map = new Map<string, Group>();
  orders.forEach((o) => {
    const gid = (o as any).deliveryGroupId || `solo_${o.id}`;
    const g = map.get(gid);
    if (g) g.orders.push(o);
    else map.set(gid, { key: gid, orders: [o] });
  });
  // Sans rang (commandes terminées) → Number.MAX_SAFE_INTEGER plutôt qu'Infinity :
  // la soustraction de deux Infinity donne NaN et casserait le comparateur.
  const rankOf = (o: Commande) =>
    (o as any).rank ?? Number.MAX_SAFE_INTEGER;
  map.forEach((g) => {
    // Rang croissant DANS le bloc ; les commandes terminées (sans rang) en fin.
    g.orders.sort((a, b) => rankOf(a) - rankOf(b));
    g.billed = g.orders.find((o) => (o as any).courseBilled === true);
  });
  // Les blocs eux-mêmes suivent le même ordre : chacun prend le rang de sa
  // commande la mieux classée, et un bloc entièrement terminé (aucun rang)
  // se retrouve en fin de liste.
  return [...map.values()].sort(
    (a, b) => rankOf(a.orders[0]) - rankOf(b.orders[0]),
  );
}

/** Course facturée d'un bloc : 0 si sur place, offerte, ou non facturée. */
function groupCourse(g: Group): number {
  const offer = g.billed ? (g.billed as any).deliveryOffer : undefined;
  const offered = offer?.active === true && offer?.coveredBy === "fastfood";
  const hasDelivery = (g.orders[0].delivery as any)?.status === true;
  if (!hasDelivery || !g.billed || offered) return 0;
  return Number((g.billed.delivery as any)?.prix) || 0;
}

/**
 * Total général d'un ensemble de commandes : articles de chaque commande +
 * course de chaque groupe de livraison (facturée une seule fois par groupe).
 * Règle unique, partagée avec la carte de la liste marchand.
 */
export function computeGrandTotal(orders: Commande[]): number {
  return buildDeliveryGroups(orders).reduce(
    (sum, g) =>
      sum +
      g.orders.reduce((s, o) => s + computeItemsTotal(o), 0) +
      groupCourse(g),
    0,
  );
}

/** Chip d'état d'une commande : libellé court + couleurs. */
const STATUS_CHIP: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "En attente", bg: "#FEF3C7", fg: "#92400E" },
  processing: { label: "En cours", bg: "#DBEAFE", fg: "#1E40AF" },
  active: { label: "En cours", bg: "#DBEAFE", fg: "#1E40AF" },
  in_progress: { label: "En cours", bg: "#DBEAFE", fg: "#1E40AF" },
  finished: { label: "Prête", bg: "#DCFCE7", fg: "#166534" },
  completed: { label: "Prête", bg: "#DCFCE7", fg: "#166534" },
  done: { label: "Prête", bg: "#DCFCE7", fg: "#166534" },
  delivering: { label: "En livraison", bg: "#FFEDD5", fg: "#9A3412" },
  delivered: { label: "Livrée", bg: "#E5E7EB", fg: "#374151" },
  cancelByUser: { label: "Annulée", bg: "#FEE2E2", fg: "#991B1B" },
  cancelByFastFood: { label: "Annulée", bg: "#FEE2E2", fg: "#991B1B" },
};

type Group = {
  /** Clé de regroupement : deliveryGroupId, ou l'id de la commande si isolée. */
  key: string;
  orders: Commande[];
  /** Commande qui porte la facturation de la course (`courseBilled === true`). */
  billed?: Commande;
};

type Props = {
  /** Commandes affichées par le sheet (une seule, ou toutes celles du groupe). */
  orders: Commande[];
  /** Plafond de la carte : dépend de la hauteur du sheet appelant (défaut 340). */
  maxHeight?: number;
};

export function MontantTab({ orders, maxHeight = 340 }: Props) {
  // Regroupe par deliveryGroupId. Une commande sans groupe forme son propre bloc.
  const groups = useMemo(() => buildDeliveryGroups(orders), [orders]);

  if (orders.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucun montant à afficher</Text>
      </View>
    );
  }

  // Total général (tous groupes confondus) — même règle que la carte de la liste.
  const grandTotal = computeGrandTotal(orders);

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      {/* Même gabarit que l'onglet Commande : carte plafonnée, contenu scrollable
          au-dessus d'une ligne de total fixe. */}
      <View style={[styles.card, { maxHeight }]}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
        >
          {groups.map((g) => {
            const itemsSum = g.orders.reduce(
              (s, o) => s + computeItemsTotal(o),
              0,
            );
            const billedOrder = g.billed;
            const coursePrice = billedOrder
              ? Number((billedOrder.delivery as any)?.prix) || 0
              : 0;
            const offer = billedOrder
              ? (billedOrder as any).deliveryOffer
              : undefined;
            const offered =
              offer?.active === true && offer?.coveredBy === "fastfood";
            const zone = (g.orders[0].delivery as any)?.zone || "";
            // Sur place : aucune course, donc aucune ligne livraison à afficher.
            const hasDelivery = (g.orders[0].delivery as any)?.status === true;

            return (
              <View key={g.key} style={styles.groupBlock}>
                {/* Total en TÊTE de groupe — masqué : seul le total général est
                    affiché. Conservé au cas où on le réactiverait.
                <View
                  style={[
                    styles.totalRow,
                    groups.length > 1 && styles.totalRowStacked,
                  ]}
                >
                  <Text style={styles.totalLabel}>
                    {g.orders.length > 1 ? "Total groupe" : "Total"}
                  </Text>
                  <Text
                    style={[
                      styles.totalVal,
                      groups.length > 1 && styles.totalValMuted,
                      groups.length > 1 && styles.totalValStacked,
                    ]}
                  >
                    {itemsSum + (offered || !hasDelivery ? 0 : coursePrice)}{" "}
                    {CURRENCY}
                  </Text>
                </View>
                */}

                {g.orders.map((o, i) => (
                  <View
                    key={o.id}
                    style={[
                      styles.row,
                      (i < g.orders.length - 1 || hasDelivery) &&
                        styles.rowBorder,
                    ]}
                  >
                    <View style={styles.rankBox}>
                      <Text style={styles.rankText}>
                        {(o as any).rank ?? "—"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.itemName}>
                          Cmd {(o as any).rank ?? "—"}
                        </Text>
                        {/* État de la commande : le groupe est absolu, il peut
                            mélanger des commandes à des stades différents. */}
                        {STATUS_CHIP[o.status] && (
                          <View
                            style={[
                              styles.statusChip,
                              { backgroundColor: STATUS_CHIP[o.status].bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                { color: STATUS_CHIP[o.status].fg },
                              ]}
                            >
                              {STATUS_CHIP[o.status].label}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemSub}>
                        Plat + extras + boissons
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {computeItemsTotal(o)} {CURRENCY}
                    </Text>
                  </View>
                ))}

                {/* Course du groupe : facturée une seule fois (courseBilled). */}
                {hasDelivery && (
                  <View style={styles.row}>
                    <View style={[styles.rankBox, styles.rankBoxIcon]}>
                      <Ionicons
                        name="bicycle-outline"
                        size={15}
                        color="#ec4913"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>
                        Livraison {deliveryLabel(billedOrder || g.orders[0])}
                      </Text>
                      {zone ? <Text style={styles.itemSub}>{zone}</Text> : null}
                    </View>
                    <Text
                      style={[
                        styles.itemPrice,
                        offered && styles.itemPriceOffered,
                      ]}
                    >
                      {offered
                        ? "Offert"
                        : billedOrder
                          ? `${coursePrice} ${CURRENCY}`
                          : "Non facturée"}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Total général : toujours affiché. L'onglet n'existe qu'à partir de 2
            commandes, mais celles-ci partagent souvent un seul `deliveryGroupId`
            (livraison groupée) et ne forment donc qu'UN bloc — l'ancienne
            condition `groups.length > 1` masquait alors le total. */}
        {orders.length > 0 && (
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total général</Text>
            <Text style={styles.grandTotalVal}>
              {grandTotal} {CURRENCY}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Gabarit identique à l'onglet Commande : le sheet est à hauteur fixe (520),
  // on plafonne la carte pour que la ligne de total reste visible.
  card: {
    flex: 1,
    maxHeight: 340,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    marginBottom: 12,
  },
  // Bloc d'un groupe de livraison : pas de fond ni de padding propres — la carte
  // parente fournit déjà les deux. Le trait du bas sépare les groupes entre eux.
  groupBlock: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rankBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBoxIcon: { backgroundColor: "#FEF2F2" },
  rankText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipText: { fontSize: 9, fontWeight: "700" },
  itemSub: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
    fontWeight: "600",
  },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#111827" },
  itemPriceOffered: { color: "#16A34A", fontSize: 12 },
  // Total en tête de groupe : c'est le bloc lui-même qui porte le trait de séparation.
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  totalRowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  totalLabel: { fontSize: 13, fontWeight: "700", color: "#111827" },
  totalValStacked: { marginTop: 2 },
  totalVal: { fontSize: 13, fontWeight: "900", color: "#ec4913" },
  // Plusieurs groupes : seul le total général reste coloré, les totaux de bloc
  // passent en noir pour ne pas concurrencer le montant final.
  totalValMuted: { color: "#111827" },
  // Ligne de total général, fixe sous la zone scrollable.
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  grandTotalLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  grandTotalVal: { fontSize: 16, fontWeight: "900", color: "#ec4913" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
});
