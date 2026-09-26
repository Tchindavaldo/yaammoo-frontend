import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React,{ useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { onSplashHidden } from "@/src/hooks/useHideSplash";

import { consumeUpdateApplied, onUpdateDownloaded } from "../services/otaNotice";

/**
 * Carte de mise a jour OTA, montee une seule fois a la racine de l'app (comme
 * `OfflineBanner`). Composant DEDIE, volontairement distinct des toasts : carte
 * blanche flottante, pastille d'icone teintee, titre + une ligne d'explication.
 *
 * - « Mise a jour telechargee » : reste affichee jusqu'a fermeture, l'utilisateur
 *   doit relancer l'app pour l'appliquer.
 * - « Application a jour » : se retire seule, un fin trait marque le temps
 *   restant.
 *
 * ⚠️ Aucun bouton « Redemarrer » : relancer une app deja peinte rejoue le boot
 * a nu (cf. `useOtaUpdates`). On invite a fermer puis rouvrir.
 */

type Kind = "downloaded" | "applied";

const CONTENT: Record<
  Kind,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; message: string }
> = {
  downloaded: {
    icon: "arrow-down",
    tint: "#ec4913",
    title: "Mise à jour téléchargée",
    message:
      "De nouvelles mises à jour viennent d'être téléchargées. Fermez puis rouvrez l'application pour en profiter.",
  },
  applied: {
    icon: "checkmark",
    tint: "#12a150",
    title: "Application à jour",
    message: "Les dernières améliorations sont installées.",
  },
};

/** Duree d'affichage de « Application a jour ». */
const APPLIED_VISIBLE_MS = 5000;
/** Laisse la home se peindre avant d'annoncer la mise a jour appliquee. */
const APPLIED_DELAY_MS = 700;
/** Marge laterale du trait de decompte, a l'interieur de la carte. */
const TRACK_INSET = 18;

/**
 * Apercu en developpement (Expo Go, Metro) : les OTA n'y existent pas, la carte
 * s'y affiche donc d'office. « Mise a jour telechargee » au lancement, puis
 * « Application a jour » a sa fermeture. Sans effet en build (`__DEV__` faux).
 */
const DEV_PREVIEW = true;

export const OtaUpdateCard = () => {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const enter = useRef(new Animated.Value(0)).current;
  const countdown = useRef(new Animated.Value(1)).current;
  const kindRef = useRef<Kind | null>(null);

  const show = useCallback(
    (next: Kind) => {
      kindRef.current = next;
      setKind(next);
      enter.setValue(0);
      Animated.spring(enter, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
      }).start();
    },
    [enter],
  );

  const hide = useCallback(() => {
    const closing = kindRef.current;
    Animated.timing(enter, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setKind(null);
      if (__DEV__ && DEV_PREVIEW && closing === "downloaded") {
        setTimeout(() => show("applied"), 400);
      }
    });
  }, [enter, show]);

  // Mise a jour appliquee : verifiee une fois au lancement, annoncee une fois
  // l'app visible. Telechargement : a tout moment de la session.
  useEffect(() => {
    if (__DEV__) {
      if (!DEV_PREVIEW) return;
      const t = setTimeout(() => show("downloaded"), 1500);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    let delay: ReturnType<typeof setTimeout> | undefined;
    let unsubSplash = () => {};

    consumeUpdateApplied().then((applied) => {
      if (!applied || cancelled) return;
      unsubSplash = onSplashHidden(() => {
        delay = setTimeout(() => {
          if (!cancelled) show("applied");
        }, APPLIED_DELAY_MS);
      });
    });
    const unsubDownloaded = onUpdateDownloaded(() => show("downloaded"));

    return () => {
      cancelled = true;
      if (delay) clearTimeout(delay);
      unsubSplash();
      unsubDownloaded();
    };
  }, [show]);

  // Retrait automatique de « Application a jour », trait de decompte a l'appui.
  useEffect(() => {
    if (kind !== "applied") return;
    countdown.setValue(1);
    const anim = Animated.timing(countdown, {
      toValue: 0,
      duration: APPLIED_VISIBLE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) hide();
    });
    return () => anim.stop();
  }, [kind, countdown, hide]);

  if (!kind) return null;
  const c = CONTENT[kind];

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { top: insets.top + 2 }]}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          },
        ]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Degrade sur tout le fond : blanc a gauche (la pastille porte deja
            la couleur), teinte a droite. Rogne par son propre calque, pour ne
            pas couper l'ombre de la carte. */}
        <LinearGradient
          pointerEvents="none"
          colors={["#ffffff", `${c.tint}1f`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
        <View style={[styles.badge, { backgroundColor: `${c.tint}14` }]}>
          <View style={[styles.badgeDot, { backgroundColor: c.tint }]}>
            <Ionicons name={c.icon} size={15} color="#fff" />
          </View>
        </View>

        <View style={styles.texts}>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.message}>{c.message}</Text>
        </View>

        <Pressable
          onPress={hide}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
        >
          <Ionicons name="close" size={16} color="#8e8e93" />
        </Pressable>

        {kind === "applied" && barWidth > 2 * TRACK_INSET && (
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.bar,
                {
                  backgroundColor: c.tint,
                  width: barWidth - 2 * TRACK_INSET,
                  transform: [
                    {
                      translateX: countdown.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-(barWidth - 2 * TRACK_INSET), 0],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    // Assez large pour masquer les boutons du header derriere.
    left: 6,
    right: 6,
    // Au-dessus des ecrans et des sheets, comme `OfflineBanner`.
    zIndex: 9999,
    elevation: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    // ⚠️ Pas d'`overflow: hidden` ici : sur iOS il couperait l'ombre. Seuls le
    // degrade et le trait de decompte sont rognes, par leur propre calque.
    // Ombre plus marquee : la carte doit se detacher d'un header blanc.
    shadowColor: "#0b0b0f",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
  },
  gradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
    overflow: "hidden",
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111114",
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6b6b72",
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f2f5",
  },
  closePressed: {
    opacity: 0.6,
  },
  track: {
    position: "absolute",
    left: TRACK_INSET,
    right: TRACK_INSET,
    bottom: 6,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  bar: {
    height: 2,
    borderRadius: 1,
    opacity: 0.4,
  },
});
