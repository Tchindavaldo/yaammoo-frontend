import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { StaffPlan } from "../types/staff.types";
import { plural } from "../utils/staffFormat";
import { capsLabel, ST } from "./staffTheme";

const SIZE = 88;
const STROKE = 9;
const R = (SIZE - STROKE) / 2 - 0.5;
const C = 2 * Math.PI * R;
const GAP = 4;
/** Au-delà, l'anneau devient continu (des segments trop fins ne se lisent plus). */
const MAX_SEGMENTS = 24;

interface Props {
  plan: StaffPlan;
  members: number;
  drivers: number;
}

/** Anneau à un segment par poste : occupés en orange, libres en gris. */
const SlotsRing = ({ used, limit }: { used: number; limit: number }) => {
  const segmented = limit > 0 && limit <= MAX_SEGMENTS;
  const step = limit > 0 ? C / limit : C;
  const seg = segmented ? Math.max(step - GAP, 1) : C;
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;

  // Rotation portée par une View : le 1er segment part de midi.
  return (
    <View style={styles.rotate}>
    <Svg width={SIZE} height={SIZE}>
      {segmented ? (
        Array.from({ length: limit }, (_, i) => (
          <Circle
            key={i}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={i < used ? ST.accent : ST.track}
            strokeWidth={STROKE}
            strokeDasharray={`${seg} ${C - seg}`}
            strokeDashoffset={-(i * step + GAP / 2)}
          />
        ))
      ) : (
        <>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={ST.track} strokeWidth={STROKE} />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={ST.accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${C * ratio} ${C}`}
          />
        </>
      )}
    </Svg>
    </View>
  );
};

/**
 * Carte des quotas (maquette « Par rôle ») : anneau des postes occupés, postes
 * libres, plan, et barre des places de livreur.
 */
export const StaffSlotsCard: React.FC<Props> = ({ plan, members, drivers }) => {
  const free = Math.max(plan.memberLimit - members, 0);
  const driverRatio = plan.driverLimit > 0 ? Math.min(drivers / plan.driverLimit, 1) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <SlotsRing used={members} limit={plan.memberLimit} />
        <View style={styles.ringCenter} pointerEvents="none">
          <Text style={styles.ringValue}>
            {members}
            <Text style={styles.ringLimit}>/{plan.memberLimit}</Text>
          </Text>
          <Text style={[capsLabel, styles.ringCaption]}>POSTES</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={{ gap: 2 }}>
          <Text style={styles.title}>
            {free > 0 ? `${plural(free, "poste libre", "postes libres")}` : "Tous les postes sont pris"}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Plan {plan.label} · {plural(plan.memberLimit, "membre")} max
          </Text>
        </View>
        <View style={{ gap: 5 }}>
          <View style={styles.barLabels}>
            <Text style={styles.barText}>Livreurs</Text>
            <Text style={styles.barText}>
              {drivers}/{plan.driverLimit}
            </Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${driverRatio * 100}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 24,
    backgroundColor: ST.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ringWrap: { width: SIZE, height: SIZE },
  rotate: { transform: [{ rotate: "-90deg" }] },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.8, color: ST.ink },
  ringLimit: { fontSize: 14, color: ST.muted },
  ringCaption: { fontSize: 10, marginTop: 1 },
  body: { flex: 1, gap: 8 },
  title: { fontSize: 17, fontWeight: "800", color: ST.ink },
  sub: { fontSize: 13, color: ST.muted },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barText: { fontSize: 12, fontWeight: "600", color: ST.text2 },
  bar: { height: 6, borderRadius: 3, backgroundColor: ST.track, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: ST.ink },
});
