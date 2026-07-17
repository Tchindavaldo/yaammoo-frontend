import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface BonusSparklineProps {
  color: string;
  /** 0 | 1 | 2 : choisit une courbe préréglée (variété visuelle). */
  variant?: number;
  height?: number;
}

// Courbes préréglées (valeurs 0→1, 0 = bas) — pour varier le rendu par carte.
const PRESETS: number[][] = [
  [0.3, 0.34, 0.3, 0.45, 0.68, 0.8, 0.74],
  [0.34, 0.3, 0.42, 0.72, 0.85, 0.6, 0.5],
  [0.3, 0.44, 0.5, 0.4, 0.55, 0.7, 0.86],
];

const W = 100;

const buildPaths = (pts: number[], h: number, pad: number) => {
  const n = pts.length;
  const stepX = W / (n - 1);
  const X = (i: number) => i * stepX;
  const Y = (v: number) => pad + (1 - v) * (h - 2 * pad);
  let line = `M ${X(0)} ${Y(pts[0])}`;
  for (let i = 1; i < n; i++) {
    const x0 = X(i - 1), y0 = Y(pts[i - 1]), x1 = X(i), y1 = Y(pts[i]);
    const cx = (x0 + x1) / 2;
    line += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  const area = `${line} L ${X(n - 1)} ${h} L ${X(0)} ${h} Z`;
  return { line, area };
};

/** Petit graphe "area" décoratif (courbe lissée + dégradé), largeur fluide. */
export const BonusSparkline: React.FC<BonusSparklineProps> = ({ color, variant = 0, height = 40 }) => {
  const pts = PRESETS[variant % PRESETS.length];
  const { line, area } = buildPaths(pts, height, 3);
  const gid = `spark-${variant}`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gid})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
};
