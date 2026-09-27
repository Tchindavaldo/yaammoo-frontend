import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { CartStatusPanel } from "@/src/features/orders/components/CartStatusPanel";
import { DS } from "@/src/theme/ds";
import { useLocalSearchParams } from "expo-router";

const STATUSES = ["pending", "active", "finished", "delivered"] as const;

/**
 * Onglet « Commandes » : état des commandes du client, pour tout utilisateur.
 * La page Boutique (marchand) n'a plus d'onglet : Profil → Boutique → Commandes.
 */
export default function OrdersScreen() {
  const { isSignedIn } = useAuthGate();
  const [headerHeight, setHeaderHeight] = useState(70);
  // Deep-link `?section=` (notifications, home) : statut ouvert au montage.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const initialStatus = STATUSES.includes(section as any)
    ? (section as (typeof STATUSES)[number])
    : "pending";

  if (!isSignedIn) {
    return (
      <GuestGate
        icon="receipt-outline"
        title="Vos commandes"
        subtitle="Connectez-vous pour suivre l'état de vos commandes."
      >
        {null}
      </GuestGate>
    );
  }

  return (
    <View style={styles.container}>
      <BlurScope>
        <TabHeader title="Commandes" onHeightChange={setHeaderHeight} />
        {/* Cible du flou du header (Android). */}
        <BlurTarget style={styles.container}>
          {/* key : un nouveau `section` remonte le panel sur ce statut. */}
          <CartStatusPanel
            key={initialStatus}
            topOffset={headerHeight}
            initialStatus={initialStatus}
          />
        </BlurTarget>
      </BlurScope>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.bg },
});
