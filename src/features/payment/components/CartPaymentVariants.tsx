import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";

/**
 * Variantes de design du contenu du sheet de paiement.
 *
 * `"actuel"` est le design en place ; les trois autres sont des propositions
 * rendues telles quelles pour comparaison à l'écran. Contrairement au design
 * actuel, elles sont **autonomes** : chacune porte son propre champ numéro et
 * son bouton payer — la capsule du bas n'est pas rendue.
 *
 * Les trois affichent les MÊMES données : montant des commandes, montant de la
 * livraison, total à payer, et la destination (zone · type · heure).
 */
export type CartPaymentVariant = "actuel" | "ticket" | "card" | "colonnes";

interface VariantProps {
  groups: CartZoneGroup[];
  network: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
  /** Numéro de paiement saisi. */
  phone: string;
  onPhoneChange: (phone: string) => void;
  /** Lance le paiement. Numéro vide → `onError`, rien ne part. */
  onConfirm: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F`;

/** Teinte de marque de chaque opérateur. */
const TINT = { orange: "#ec4913", mtn: "#f5b301" } as const;

/** Montants agrégés + libellés de destination, communs aux trois variantes. */
const useRecap = (groups: CartZoneGroup[]) => {
  const cmd = groups.reduce((s, g) => s + g.entries.length, 0);
  const articles = groups.reduce((s, g) => s + g.articles, 0);
  const course = groups.reduce((s, g) => s + g.livraison, 0);
  const total = groups.reduce((s, g) => s + g.total, 0);

  const multi = groups.length > 1;
  const g = groups[0];
  const zone = multi ? `${groups.length} zones` : g?.zone || "";
  const type = multi
    ? "livraisons"
    : g?.type === "express"
      ? "express"
      : g?.type === "time"
        ? "créneau"
        : "sur place";
  const heure = multi ? "" : g?.type === "time" ? g?.heure || "" : "";

  return { cmd, articles, course, total, zone, type, heure };
};

/** Ligne « zone · type · heure », rendue à l'identique dans les 3 variantes. */
const Destination: React.FC<{
  zone: string;
  type: string;
  heure: string;
  style?: any;
}> = ({ zone, type, heure, style }) => (
  <Text style={style} numberOfLines={1}>
    {[zone, type, heure].filter(Boolean).join(" · ").toUpperCase()}
  </Text>
);

/**
 * Champ numéro + bouton payer, partagé par les 3 variantes.
 *
 * `tone` change l'allure : `"filled"` (champ gris, bouton rond) ou `"outlined"`
 * (champ bordé, bouton large libellé).
 */
const PhoneField: React.FC<{
  phone: string;
  onPhoneChange: (v: string) => void;
  onConfirm: () => void;
  onError?: (message: string) => void;
  tint: string;
  tone?: "filled" | "outlined";
}> = ({ phone, onPhoneChange, onConfirm, onError, tint, tone = "filled" }) => {
  const submit = () => {
    if (!phone.trim()) {
      onError?.("Saisissez le numéro de paiement");
      return;
    }
    onConfirm();
  };

  return (
    <View style={[s.field, tone === "outlined" && s.fieldOutlined]}>
      <Ionicons name="call-outline" size={16} color="#94a3b8" />
      <TextInput
        style={s.input}
        value={phone}
        onChangeText={onPhoneChange}
        placeholder="numéro de paiement"
        placeholderTextColor="#b6c0cc"
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {tone === "filled" ? (
        <TouchableOpacity
          style={[s.payRound, { backgroundColor: tint }]}
          onPress={submit}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-forward" size={17} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[s.payWide, { backgroundColor: tint }]}
          onPress={submit}
          activeOpacity={0.85}
        >
          <Text style={s.payWideText}>payer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Variante 1 — TICKET : reçu perforé, le paiement en talon détachable. */
/* ------------------------------------------------------------------ */

export const PaymentVariantTicket: React.FC<VariantProps> = ({
  groups,
  network,
  onNetworkChange,
  phone,
  onPhoneChange,
  onConfirm,
  onError,
}) => {
  const { cmd, articles, course, total, zone, type, heure } = useRecap(groups);

  return (
    <View style={s.ticket}>
      {/* Souche : destination + postes de depense + total. */}
      <View style={s.ticketStub}>
        <Destination
          zone={zone}
          type={type}
          heure={heure}
          style={s.ticketDest}
        />

        <View style={s.ticketLine}>
          <Text style={s.ticketLabel}>{cmd} commandes</Text>
          <Text style={s.ticketValue}>{fmt(articles)}</Text>
        </View>
        <View style={s.ticketLine}>
          <Text style={s.ticketLabel}>Livraison</Text>
          <Text style={[s.ticketValue, course === 0 && s.free]}>
            {course > 0 ? fmt(course) : "Offerte"}
          </Text>
        </View>
        <View style={[s.ticketLine, { marginTop: 4 }]}>
          <Text style={s.ticketTotalLabel}>À PAYER</Text>
          <Text style={s.ticketTotal}>{fmt(total)}</Text>
        </View>
      </View>

      {/* Dentelure de decoupe : le talon du bas porte le paiement. */}
      <View style={s.perforation}>
        <View style={[s.notch, { marginLeft: -6 }]} />
        <View style={s.dashes} />
        <View style={[s.notch, { marginRight: -6 }]} />
      </View>

      <View style={s.ticketPay}>
        {/* Reseaux en segments jointifs, facon selecteur. */}
        <View style={s.segment}>
          {(["orange", "mtn"] as const).map((net) => {
            const active = network === net;
            return (
              <TouchableOpacity
                key={net}
                style={[
                  s.segmentItem,
                  active && { backgroundColor: TINT[net] },
                ]}
                onPress={() => onNetworkChange?.(net)}
                activeOpacity={0.85}
              >
                <Text
                  style={[s.segmentText, active && s.segmentTextActive]}
                  numberOfLines={1}
                >
                  {net === "orange" ? "Orange Money" : "MTN MoMo"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PhoneField
          phone={phone}
          onPhoneChange={onPhoneChange}
          onConfirm={onConfirm}
          onError={onError}
          tint={TINT[network]}
        />
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Variante 2 — CARD : facture, montant en bandeau colore.              */
/* ------------------------------------------------------------------ */

export const PaymentVariantCard: React.FC<VariantProps> = ({
  groups,
  network,
  onNetworkChange,
  phone,
  onPhoneChange,
  onConfirm,
  onError,
}) => {
  const { cmd, articles, course, total, zone, type, heure } = useRecap(groups);
  const tint = TINT[network];

  return (
    <>
      <View style={s.card}>
        {/* Bandeau colore : le montant a payer, impossible a manquer. */}
        <View style={[s.cardHead, { backgroundColor: tint }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardHeadLabel}>TOTAL À PAYER</Text>
            <Destination
              zone={zone}
              type={type}
              heure={heure}
              style={s.cardHeadDest}
            />
          </View>
          <Text style={s.cardHeadTotal}>{fmt(total)}</Text>
        </View>

        <View style={s.cardBody}>
          <View style={s.cardLine}>
            <Text style={s.cardLabel}>{cmd} commandes</Text>
            <Text style={s.cardValue}>{fmt(articles)}</Text>
          </View>
          <View style={s.cardLine}>
            <Text style={s.cardLabel}>Livraison</Text>
            <Text style={[s.cardValue, course === 0 && s.free]}>
              {course > 0 ? fmt(course) : "Offerte"}
            </Text>
          </View>
        </View>
      </View>

      {/* Reseaux en pilules, puis le champ numero borde. */}
      <View style={s.rowAuto}>
        {(["orange", "mtn"] as const).map((net) => {
          const active = network === net;
          return (
            <TouchableOpacity
              key={net}
              style={[s.pill, active && { backgroundColor: TINT[net] }]}
              onPress={() => onNetworkChange?.(net)}
              activeOpacity={0.85}
            >
              <Text style={[s.pillText, active && s.pillTextActive]}>
                {net === "orange" ? "Orange Money" : "MTN MoMo"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ marginTop: 10 }}>
        <PhoneField
          phone={phone}
          onPhoneChange={onPhoneChange}
          onConfirm={onConfirm}
          onError={onError}
          tint={tint}
          tone="outlined"
        />
      </View>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Variante 3 — COLONNES : récap à gauche, réseau + saisie à droite.    */
/* ------------------------------------------------------------------ */

export const PaymentVariantColonnes: React.FC<VariantProps> = ({
  groups,
  network,
  onNetworkChange,
  phone,
  onPhoneChange,
  onConfirm,
  onError,
}) => {
  const { cmd, articles, course, total, zone, type, heure } = useRecap(groups);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.split}>
        {/* Colonne gauche : le total domine, les postes suivent, la
            destination ferme le bloc. */}
        <View style={s.splitLeft}>
          <Text style={s.splitTotal}>{fmt(total)}</Text>
          <Text style={s.splitLabel}>TOTAL À PAYER</Text>

          <View style={s.splitLines}>
            <View style={s.splitLine}>
              <Text style={s.splitLineLabel}>{cmd} cmd</Text>
              <Text style={s.splitLineValue}>{fmt(articles)}</Text>
            </View>
            <View style={s.splitLine}>
              <Text style={s.splitLineLabel}>Livraison</Text>
              <Text style={[s.splitLineValue, course === 0 && s.free]}>
                {course > 0 ? fmt(course) : "Offerte"}
              </Text>
            </View>
          </View>

          <Destination
            zone={zone}
            type={type}
            heure={heure}
            style={s.splitDest}
          />
        </View>

        {/* Colonne droite : les 2 reseaux EMPILES. */}
        <View style={s.splitRight}>
          {(["orange", "mtn"] as const).map((net) => {
            const active = network === net;
            const tint = TINT[net];
            return (
              <TouchableOpacity
                key={net}
                style={[
                  s.stackCard,
                  active && { borderColor: tint, backgroundColor: `${tint}14` },
                ]}
                onPress={() => onNetworkChange?.(net)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={15}
                  color={active ? tint : "#cbd5e1"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.stackText, active && { color: tint }]}
                    numberOfLines={1}
                  >
                    {net === "orange" ? "Orange" : "MTN"}
                  </Text>
                  <Text style={s.stackSub} numberOfLines={1}>
                    {net === "orange" ? "Orange Money" : "MoMo"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Saisie sur toute la largeur, sous les deux colonnes. */}
      <View style={{ marginTop: "auto" }}>
        <PhoneField
          phone={phone}
          onPhoneChange={onPhoneChange}
          onConfirm={onConfirm}
          onError={onError}
          tint={TINT[network]}
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  rowAuto: { flexDirection: "row", gap: 10 },
  free: { color: "#16a34a" },

  // --- Champ numero + bouton payer ---
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
  },
  fieldOutlined: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    padding: 0,
  },
  payRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  payWide: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  payWideText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  // --- Ticket ---
  ticket: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  ticketStub: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  ticketDest: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  ticketLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 1,
  },
  ticketLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  ticketValue: { fontSize: 12, color: "#0f172a", fontWeight: "700" },
  ticketTotalLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
  },
  ticketTotal: { fontSize: 20, fontWeight: "900", color: "#ec4913" },
  perforation: { flexDirection: "row", alignItems: "center", height: 12 },
  notch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dashes: {
    flex: 1,
    height: 1,
    marginHorizontal: 6,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
  },
  ticketPay: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    marginTop: "auto",
  },
  // Selecteur segmente : les 2 reseaux jointifs dans un meme rail.
  segment: {
    flexDirection: "row",
    backgroundColor: "#e9eef4",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  segmentTextActive: { color: "#fff" },

  // --- Card / facture ---
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardHeadLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.8,
  },
  cardHeadDest: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.6,
  },
  cardHeadTotal: { fontSize: 20, fontWeight: "900", color: "#fff" },
  cardBody: { paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  cardLine: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  cardValue: { fontSize: 12, color: "#0f172a", fontWeight: "700" },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  pillText: { fontSize: 12, fontWeight: "700", color: "rgba(31,41,55,0.7)" },
  pillTextActive: { color: "#fff" },

  // --- Deux colonnes ---
  split: { flexDirection: "row", gap: 14 },
  splitLeft: { flex: 1, justifyContent: "center" },
  splitTotal: { fontSize: 24, fontWeight: "900", color: "#ec4913" },
  splitLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
  },
  splitLines: {
    marginTop: 8,
    marginBottom: 6,
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 6,
  },
  splitLine: { flexDirection: "row", justifyContent: "space-between" },
  splitLineLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  splitLineValue: { fontSize: 11, fontWeight: "700", color: "#0f172a" },
  splitDest: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.6,
  },
  splitRight: { flex: 1, justifyContent: "center", gap: 8 },
  stackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  stackText: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  stackSub: { fontSize: 10, fontWeight: "600", color: "#94a3b8" },
});
