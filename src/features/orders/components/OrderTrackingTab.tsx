import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Commande } from "@/src/types";
import { DS } from "@/src/theme/ds";
import { formatDistanceKm } from "@/src/utils/formatDistance";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { estimateArrival, formatAgo, formatClock } from "../utils/trackingEta";
import OrderTrackingMap from "./OrderTrackingMap";

/**
 * Onglet « Suivi » du détail client (`OrderBottomSheet`), visible pendant la
 * course (`delivering`) : carte (livreur + adresse de livraison), heure
 * d'arrivée estimée et distance. Positions : `useOrderTracking` (HTTP puis
 * socket `driverLocationUpdated`).
 */

/** Rafraîchit « il y a N s » et l'heure estimée sans nouvelle position. */
const TICK_MS = 15 * 1000;

export function OrderTrackingTab({ order }: { order: Commande }) {
  const hasDriver = !!order.driverId;
  const { driver, destination, loading, error, retry } = useOrderTracking(
    order.id,
    hasDriver && order.status === "delivering",
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  if (!hasDriver) {
    return (
      <View style={styles.container}>
        <View style={[styles.mapCard, styles.center]}>
          <Ionicons name="storefront-outline" size={28} color={DS.faint} />
          <Text style={styles.emptyTitle}>La boutique livre elle-même</Text>
          <Text style={styles.emptyText}>
            Le suivi en direct est disponible avec les livreurs Yaammoo.
          </Text>
        </View>
      </View>
    );
  }

  const eta =
    driver && destination
      ? estimateArrival(driver, destination, new Date(now))
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.mapCard}>
        {loading && !driver ? (
          <View style={styles.center}>
            <ActivityIndicator color={DS.accent} />
          </View>
        ) : error && !driver ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={26} color={DS.faint} />
            <Text style={styles.emptyTitle}>Suivi indisponible</Text>
            <TouchableOpacity onPress={retry} style={styles.retry}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <OrderTrackingMap driver={driver} destination={destination} />
            <View style={styles.badge} pointerEvents="none">
              <View
                style={[
                  styles.dot,
                  { backgroundColor: driver ? DS.success : DS.warning },
                ]}
              />
              <Text style={styles.badgeText}>
                {driver
                  ? `Position ${formatAgo(driver.capturedAt, now)}`
                  : "En attente de la position du livreur…"}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.row}>
        <InfoTile
          icon="time-outline"
          label="Arrivée estimée"
          value={eta ? formatClock(eta.arrivalAt) : "—"}
          hint={eta ? `dans ${eta.minutes} min` : undefined}
        />
        <InfoTile
          icon="navigate-outline"
          label="Distance"
          value={eta ? (formatDistanceKm(eta.distanceKm) ?? "—") : "—"}
          hint={eta ? "environ, par la route" : undefined}
        />
      </View>
    </View>
  );
}

function InfoTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={16} color={DS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileValue} numberOfLines={1}>
          {value}
        </Text>
        {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  mapCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: DS.gray100,
    borderWidth: 1,
    borderColor: DS.gray100,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: DS.ink,
  },
  emptyText: {
    fontSize: 12,
    color: DS.muted,
    textAlign: "center",
  },
  retry: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: DS.ink,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: DS.onInk,
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: DS.bg,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: DS.text2,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: DS.gray50,
    borderWidth: 1,
    borderColor: DS.gray100,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accentTint,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: DS.faint,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tileValue: {
    fontSize: 15,
    fontWeight: "800",
    color: DS.ink,
  },
  tileHint: {
    fontSize: 10,
    color: DS.muted,
  },
});
