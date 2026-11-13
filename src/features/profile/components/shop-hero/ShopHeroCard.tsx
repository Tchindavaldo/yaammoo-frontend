"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ShopPeriodSheet } from "./ShopPeriodSheet";
import { ShopPeriod, defaultPeriod, periodLabel, periodStatLabel } from "./shopPeriod";
import { useMerchantStats } from "./useMerchantStats";
import { RevenueSlide } from "./slides/RevenueSlide";
import { FunnelSlide, conversionRate } from "./slides/FunnelSlide";
import { RankingSlide } from "./slides/RankingSlide";
import { StatusSlide, cancelRate } from "./slides/StatusSlide";
import { HeatmapSlide } from "./slides/HeatmapSlide";
import { LoyaltySlide } from "./slides/LoyaltySlide";
import { DelaySlide } from "./slides/DelaySlide";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

/**
 * Hero du home marchand (page « Stats hero » du canvas Design) : en-tete fixe
 * (periode + pastille), puis un carrousel de graphiques a glisser, avec des
 * points indiquant la slide courante. Ordre : H1, S13, T1, S7, S6, S12, S15.
 * Donnees : GET /fastFood/:id/stats (useMerchantStats).
 */

export const ShopHeroCard: React.FC = () => {
  useLanguage();
  const [period, setPeriod] = useState<ShopPeriod>(defaultPeriod);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const { stats, bucket, version } = useMerchantStats(period);

  // Titre de chaque slide ; le chiffre cle s'affiche a cote quand la slide n'a pas de cases.
  const titles: [string, string?][] = [["Ventes"], ["Conversion", conversionRate(stats.funnel)], ["Classements"], ["Statuts", cancelRate(stats)], ["Affluence"], ["Fidélité"], ["Délais"]];
  const slides = [
    <RevenueSlide key="h1" stats={stats} bucket={bucket} version={version} periodLabel={periodStatLabel(period)} />,
    <FunnelSlide key="s13" stats={stats} version={version} />,
    <RankingSlide key="t1" stats={stats} version={version} />,
    <StatusSlide key="s7" stats={stats} bucket={bucket} version={version} />,
    <HeatmapSlide key="s6" stats={stats} version={version} />,
    <LoyaltySlide key="s12" stats={stats} bucket={bucket} version={version} />,
    <DelaySlide key="s15" stats={stats} bucket={bucket} version={version} />,
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };
  const title = titles[index] ?? titles[0];

  return (
    <View style={styles.wrap}>
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable onPress={() => setSheetOpen(true)} hitSlop={6} accessibilityRole="button" style={styles.periodBtn}>
          <Text style={styles.name} numberOfLines={1}>{periodLabel(period)}</Text>
          <Ionicons name="chevron-down" size={14} color={DS.ink} />
        </Pressable>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{title[1] ? `${t(title[0])} · ${title[1]}` : t(title[0])}</Text>
        </View>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
            nestedScrollEnabled
          >
            {slides.map((s, i) => (
              <View key={i} style={{ width }}>{s}</View>
            ))}
          </ScrollView>
        )}
      </View>

      <ShopPeriodSheet visible={sheetOpen} value={period} onClose={() => setSheetOpen(false)} onChange={setPeriod} />
    </View>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: { gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 28, backgroundColor: DS.surface },
  top: { height: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, gap: 8 },
  periodBtn: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: DS.bg },
  name: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: DS.ink, letterSpacing: -0.2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: DS.bg },
  chipText: { fontSize: 12, fontWeight: "600", color: DS.ink },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DS.idle },
  dotOn: { width: 16, backgroundColor: DS.ink },
});
