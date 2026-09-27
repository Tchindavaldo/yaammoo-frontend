import { orderGroupKey } from "@/src/features/merchant/utils/orderGroupKey";
import { DS } from "@/src/theme/ds";
import { Commande } from "@/src/types";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Helpers et sous-composants de `CartStatusPanel` (page « État des commandes »
 * du client). Propres au client : rien de partagé avec le marchand.
 */

export type SubTabKey = "attente" | "cours" | "termine";

/** Sous-tabs de livraison d'un groupe (onglet Terminées) : calqué marchand. */
export const GroupSubTabs = React.memo(function GroupSubTabs({
  counts,
  active,
  onSelect,
}: {
  counts: { attente: number; cours: number; termine: number };
  active: SubTabKey;
  onSelect: (k: SubTabKey) => void;
}) {
  const tab = (key: SubTabKey, label: string, count: number) => {
    const on = active === key;
    return (
      <TouchableOpacity
        style={[styles.subTab, on && styles.subTabActive]}
        onPress={() => onSelect(key)}
      >
        <Text style={[styles.subTabLabel, on && styles.subTabLabelActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.subTabBadge, on && styles.subTabBadgeActive]}>
            <Text
              style={[styles.subTabBadgeText, on && styles.subTabBadgeTextActive]}
            >
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.subTabRow}>
      {tab("attente", "En attente", counts.attente)}
      {tab("cours", "En cours", counts.cours)}
      {tab("termine", "Terminé", counts.termine)}
    </View>
  );
});

export const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const getOrderDate = (o: any): Date | null => {
  const raw = o?.livraison?.date || o?.delivery?.date || o?.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Groupage des commandes en lignes, même règle que la liste marchand
 * (`orderGroupKey`) : un client, une date, un créneau/zone. La tête est la
 * commande la mieux classée ; les lignes suivent l'ordre des rangs.
 */
export const groupBySlot = (
  arr: Commande[],
): { head: Commande; group: Commande[] }[] => {
  const buckets = new Map<string, Commande[]>();
  arr.forEach((o) => {
    const key = orderGroupKey(o);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(o);
    else buckets.set(key, [o]);
  });

  const rankOf = (o: any) => o?.rank ?? Infinity;
  const entries: { head: Commande; group: Commande[] }[] = [];
  buckets.forEach((group) => {
    const sorted = [...group].sort((a, b) => rankOf(a) - rankOf(b));
    entries.push({ head: sorted[0], group: sorted });
  });
  return entries.sort((a, b) => rankOf(a.head) - rankOf(b.head));
};

/** Lignes de la FlatList virtualisée de `CartStatusPanel`. */
export type FlatItem =
  | {
      type: "order-card";
      key: string;
      order: Commande;
      /** Commandes du même groupe (livraison mutualisée) — nav multi-cmd du sheet. */
      group: Commande[];
      isFinished: boolean;
    }
  | {
      type: "group-subtabs";
      key: string;
      groupId: string;
      counts: { attente: number; cours: number; termine: number };
    }
  | { type: "empty"; key: string };

/**
 * Aplatissement des commandes filtrées en lignes. L'onglet « Terminées »
 * (`isDeliveryTab`) ajoute les sous-tabs de livraison et n'affiche que le
 * sous-tab actif.
 */
export const buildFlatItems = (
  orders: Commande[],
  isDeliveryTab: boolean,
  sub: SubTabKey,
): FlatItem[] => {
  if (orders.length === 0) return [{ type: "empty", key: "empty" }];
  const items: FlatItem[] = [];
  const push = (list: Commande[], isFinished: boolean) => {
    for (const { head, group } of groupBySlot(list)) {
      items.push({ type: "order-card", key: `oc:${head.id}`, order: head, group, isFinished });
    }
  };
  if (!isDeliveryTab) {
    push(orders, false);
    return items;
  }
  const attente = orders.filter((o) => o.status === "finished");
  const cours = orders.filter((o) => o.status === "delivering");
  const termine = orders.filter((o) => o.status === "delivered");
  items.push({
    type: "group-subtabs",
    key: "gst:all",
    groupId: "all",
    counts: { attente: attente.length, cours: cours.length, termine: termine.length },
  });
  push(sub === "cours" ? cours : sub === "termine" ? termine : attente, true);
  return items;
};

/** Clé de période d'une commande : "express", "surplace" ou le créneau ("12h"). */
export const periodKeyOf = (o: any): string => {
  const d = o?.delivery;
  if (d?.status !== true) return "surplace";
  if (d?.type === "express") return "express";
  return d?.time || "À définir";
};

/** ISO (YYYY-MM-DD) de la date de livraison d'une commande. */
export const getOrderDateISO = (o: any): string => {
  const d = getOrderDate(o);
  return d ? d.toISOString().substring(0, 10) : "";
};

/** Libellé d'un chip de date : « 10 juin ». */
export const formatDateLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
};

const styles = StyleSheet.create({
  subTabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: DS.gray100,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  subTabActive: {
    backgroundColor: DS.bg,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabLabel: { fontSize: 11, fontWeight: "600", color: DS.faint },
  subTabLabelActive: { color: DS.ink },
  subTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DS.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  subTabBadgeActive: { backgroundColor: DS.accent + "10" },
  subTabBadgeText: { fontSize: 9, fontWeight: "700", color: DS.muted },
  subTabBadgeTextActive: { color: DS.accent },
});
