import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { Toast } from "@/src/components/Toast";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useBroadcast } from "../../hooks/useBroadcast";
import { useMerchant } from "../../hooks/useMerchant";
import type {
  BroadcastAudience,
  BroadcastDraft,
  BroadcastItem,
} from "../../types/broadcast.types";
import { computeQuota } from "../../utils/broadcastQuota";
import { BroadcastComposer } from "./BroadcastComposer";
import { BroadcastHistory } from "./BroadcastHistory";
import { BroadcastQuotaTiles } from "./BroadcastQuotaTiles";
import { BroadcastWeekCard } from "./BroadcastWeekCard";
import { BC } from "./broadcastTheme";

const FAB_HEIGHT = 56;

/** « Mes clients » par défaut quand le plan le permet, sinon sa 1re audience. */
const defaultAudience = (allowed: BroadcastAudience[]): BroadcastAudience =>
  allowed.includes("customers") ? "customers" : allowed[0] || "customers";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type ToastState = { message: string; type: "success" | "error" } | null;

/**
 * Écran plein écran « Notifications » (Settings → Boutique) : quota du plan,
 * semaine en barres, derniers envois, et composeur d'une notification envoyée
 * aux clients. Vue absolue dans l'arbre comme MenuManageModal (pas de <Modal>).
 */
export const BroadcastManageModal: React.FC<Props> = ({ visible, onClose }) => {
  const [toast, setToast] = useState<ToastState>(null);
  const onLoadError = useCallback(
    () => setToast({ message: "Impossible de charger vos notifications", type: "error" }),
    [],
  );
  const { plan, cities, items, loaded, refreshing, sending, refresh, send } = useBroadcast(
    visible,
    onLoadError,
  );
  const { menus } = useMerchant();
  const tabBarHeight = useTabBarHeight();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [now, setNow] = useState(() => new Date());
  const [draft, setDraft] = useState<BroadcastDraft | null>(null);

  // Compte à rebours et changement de jour : une mise à jour par 30 s suffit.
  // Premier tick immédiat à chaque ouverture (l'écran reste monté fermé).
  useEffect(() => {
    if (!visible) return;
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [visible]);

  const quota = useMemo(() => computeQuota(plan, items, now), [plan, items, now]);

  const menuImages = useMemo(() => {
    const urls = new Set<string>();
    for (const m of menus as any[]) {
      if (typeof m?.image === "string" && m.image.startsWith("http")) urls.add(m.image);
      for (const u of m?.images || []) if (typeof u === "string" && u.startsWith("http")) urls.add(u);
    }
    return Array.from(urls).slice(0, 12);
  }, [menus]);

  if (!visible) return null;

  const canWrite = quota.dayLeft > 0 && plan.audiences.length > 0;
  const fabBottom = tabBarHeight + 12;

  const openComposer = (from?: BroadcastItem) => {
    if (!canWrite) {
      setToast({ message: "Quota du jour atteint", type: "error" });
      return;
    }
    // Un envoi réutilisé garde son audience si le plan la permet encore.
    const reuse = from && plan.audiences.includes(from.audience);
    setDraft({
      title: from?.title || "",
      body: from?.body || "",
      imageUri: from?.imageUrl || null,
      audience: reuse ? from.audience : defaultAudience(plan.audiences),
      city: reuse && from.city && cities.includes(from.city) ? from.city : null,
    });
  };

  const onSend = async (d: BroadcastDraft) => {
    const result = await send(d);
    setToast(
      result.ok
        ? { message: "Notification envoyée", type: "success" }
        : { message: result.message, type: "error" },
    );
    return result.ok;
  };

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Notifications"
        subtitle={`${quota.dayLeft} restante${quota.dayLeft > 1 ? "s" : ""} aujourd’hui`}
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 12, paddingBottom: fabBottom + FAB_HEIGHT + 14 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            progressViewOffset={headerHeight}
          />
        }
      >
        <BroadcastWeekCard plan={plan} quota={quota} now={now} />
        <BroadcastQuotaTiles plan={plan} quota={quota} now={now} />
        <BroadcastHistory
          items={items}
          now={now}
          loading={!loaded}
          onReuse={openComposer}
          style={styles.history}
        />
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: fabBottom }]} pointerEvents="box-none">
        <Pressable
          onPress={() => openComposer()}
          style={({ pressed }) => [
            styles.fab,
            canWrite ? styles.fabOn : styles.fabOff,
            pressed && canWrite && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={18} color={canWrite ? "#fff" : "#8A8A90"} />
          <Text style={[styles.fabText, { color: canWrite ? "#fff" : "#8A8A90" }]}>
            {canWrite ? "Écrire une notification" : "Quota du jour atteint"}
          </Text>
        </Pressable>
      </View>

      {draft && (
        <BroadcastComposer
          initial={draft}
          menuImages={menuImages}
          audiences={plan.audiences}
          cities={cities}
          sending={sending}
          restBottom={tabBarHeight + 10}
          onSend={onSend}
          onClose={() => setDraft(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: "transparent",
  },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 10, paddingHorizontal: 16 },
  history: { flexGrow: 1 },
  fabWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fab: {
    height: FAB_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    borderRadius: FAB_HEIGHT / 2,
  },
  fabOn: {
    backgroundColor: BC.ink,
    shadowColor: BC.ink,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fabOff: { backgroundColor: BC.line },
  fabText: { fontSize: 16, fontWeight: "600" },
});
