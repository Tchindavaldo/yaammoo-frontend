import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { C, styles } from "./CartPaymentSheet.styles";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")}`;

interface CartPaymentBodyProps {
  /** Groupes payés : alimentent le récapitulatif et l'en-tête de réception. */
  groups: CartZoneGroup[];
  /** Montant réellement envoyé au backend (livraison mutualisée incluse). */
  totalAmount: number;
  network: "orange" | "mtn";
  onNetworkChange: (network: "orange" | "mtn") => void;
  /** Paiement parti : le choix du réseau est verrouillé. */
  isBusy: boolean;
  /**
   * Parcours groupé : tout part en UNE seule course, le récapitulatif porte
   * donc une ligne « Livraison » unique au lieu d'une ligne par groupe.
   */
  grouped?: boolean;
  /** Frais de la course unique (parcours groupé uniquement). */
  groupedLivraison?: number;
}

/**
 * CORPS du paiement du panier — cards de mode de réception, récapitulatif et
 * choix du réseau Mobile Money.
 *
 * Extrait de `CartPaymentSheet` pour être rendu à l'identique dans DEUX hôtes :
 * le sheet de paiement autonome (panier à une seule course) et le troisième
 * calque du sheet de livraison groupée, où les trois étapes vivent dans un même
 * `Modal`. La capsule de saisie (`CartPaymentOverlay`) n'en fait pas partie :
 * elle est ancrée hors du sheet par chaque hôte.
 */
export const CartPaymentBody: React.FC<CartPaymentBodyProps> = ({
  groups,
  totalAmount,
  network,
  onNetworkChange,
  isBusy,
  grouped,
  groupedLivraison,
}) => {
  const cmd = groups.reduce((s, g) => s + g.entries.length, 0);
  const articles = groups.reduce((s, g) => s + g.articles, 0);

  /**
   * Lignes « Livraison » du récapitulatif.
   *
   * Parcours GROUPÉ : une seule ligne — tout part dans la même course, détailler
   * par groupe n'aurait plus de sens (« Récupérer sur place » à 0 F si rien
   * n'est livré). Sinon UNE LIGNE PAR GROUPE payé :
   * - livraison : `Livraison · Express|<heure> · <zone>` ;
   * - retrait   : `récupérer à la boutique · N cmd`.
   */
  const shipRows = grouped
    ? [
        {
          key: "grouped",
          // Tout en retrait : rien a livrer, on l'affiche tel quel a 0 F.
          label: groups.every((g) => g.type !== "express" && g.type !== "time")
            ? "Récupérer sur place"
            : "Livraison",
          frais: groupedLivraison ?? 0,
        },
      ]
    : groups.map((g) => {
        const n = g.entries.length;
        if (g.type === "express" || g.type === "time") {
          const quand =
            g.type === "express" ? "Express" : g.heure || "Programmée";
          return {
            key: g.key,
            label: `Livraison · ${quand} · ${g.zone}`,
            frais: g.livraison,
          };
        }
        return {
          key: g.key,
          label: `récupérer à la boutique · ${n} cmd`,
          frais: g.livraison,
        };
      });

  /**
   * Cards de mode de livraison, reprises du design d'origine (Express / À
   * l'heure / Sur place). Elles sont en **lecture seule** : le mode est fixé
   * commande par commande dans le panier, le sheet ne fait que montrer ceux
   * réellement payés, avec leur nombre de commandes et leurs frais de course.
   */
  const modes = React.useMemo(() => {
    const acc = {
      express: { count: 0, frais: 0 },
      time: { count: 0, frais: 0 },
      aucune: { count: 0, frais: 0 },
    };
    groups.forEach((g) => {
      const k = (
        g.type === "express" || g.type === "time" ? g.type : "aucune"
      ) as keyof typeof acc;
      acc[k].count += g.entries.length;
      acc[k].frais += g.livraison;
    });
    return [
      {
        key: "express" as const,
        label: "Express",
        sub: "25–35 min",
        ...acc.express,
      },
      {
        key: "time" as const,
        label: "À l'heure",
        // Heure du créneau si une seule est payée, sinon libellé générique.
        sub:
          groups.filter((g) => g.type === "time" && g.heure).length === 1
            ? groups.find((g) => g.type === "time" && g.heure)!.heure!
            : "Programmée",
        ...acc.time,
      },
      {
        key: "aucune" as const,
        label: "Sur place",
        sub: "Je récupère",
        ...acc.aucune,
      },
    ];
  }, [groups]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Cards de mode de livraison (design d'origine), en haut de la zone.
          LECTURE SEULE : le mode est fixé commande par commande dans le panier
          — la card active est celle réellement payée. */}
      <Text style={styles.label}>MODE DE RÉCEPTION</Text>
      <View style={styles.modes}>
        {modes.map((m) => {
          const active = m.count > 0;
          return (
            <View
              key={m.key}
              style={[styles.mode, active && styles.modeActive]}
            >
              <Text style={styles.modeLabel} numberOfLines={1}>
                {m.label}
              </Text>
              <Text style={styles.modeSub} numberOfLines={1}>
                {active ? `${m.count} cmd · ${m.sub}` : m.sub}
              </Text>
              <Text
                style={[styles.modeFee, !active && styles.modeFeeOff]}
                numberOfLines={1}
              >
                {!active ? "—" : m.frais > 0 ? `${fmt(m.frais)} F` : "Gratuit"}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.label, styles.labelSpaced]}>RÉCAPITULATIF</Text>
      <View style={styles.recap}>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>
            Total commande{" "}
            <Text style={styles.recapLabelDim}>
              ({cmd} commande{cmd > 1 ? "s" : ""})
            </Text>
          </Text>
          <Text style={styles.recapValue}>{fmt(articles)} F</Text>
        </View>
        {/* Une ligne par groupe : le mode et la zone (ou le retrait) sont
            portes par le libelle, le montant reste a droite. */}
        {shipRows.map((r) => (
          <View key={r.key} style={styles.recapRow}>
            <Text style={styles.recapLabel} numberOfLines={2}>
              {r.label}
            </Text>
            <Text style={[styles.recapValue, r.frais === 0 && { color: C.ok }]}>
              {r.frais > 0 ? `${fmt(r.frais)} F` : "Offerte"}
            </Text>
          </View>
        ))}
        <View style={styles.dash} />
        <View style={styles.recapRow}>
          <Text style={styles.totalLabel}>Total à payer</Text>
          <Text style={styles.totalValue}>{fmt(totalAmount)} FCFA</Text>
        </View>
      </View>

      <Text style={[styles.label, styles.labelSpaced]}>MOYEN DE PAIEMENT</Text>
      <View style={styles.pays}>
        {(
          [
            { key: "orange", name: "Orange Money" },
            { key: "mtn", name: "MTN MoMo" },
          ] as const
        ).map((p) => {
          const active = network === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.pay, active && styles.payActive]}
              onPress={() => onNetworkChange(p.key)}
              activeOpacity={0.85}
              disabled={isBusy}
            >
              <Text
                style={[styles.payName, active && styles.payNameActive]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};
