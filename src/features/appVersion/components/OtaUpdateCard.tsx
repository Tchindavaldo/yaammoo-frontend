import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { onSplashHidden } from "@/src/hooks/useHideSplash";
import { TAB_BAR_INSET_RATIO } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";

import {
  consumeUpdateApplied,
  onUpdateDownloaded,
} from "../services/otaNotice";

/**
 * Carte de mise a jour OTA, montee une seule fois a la racine de l'app (comme
 * `OfflineBanner`). Composant DEDIE, volontairement distinct des toasts : carte
 * sombre flottante par-dessus la barre d'onglets, pastille d'icone teintee,
 * titre + explication. Les deux cartes se retirent seules (`VISIBLE_MS`), un
 * fin trait marque le temps restant.
 *
 * - « Mise a jour telechargee » : l'utilisateur doit relancer l'app pour
 *   l'appliquer.
 * - « Application a jour » : ce lancement execute une update nouvelle.
 *
 * ⚠️ Aucun bouton « Redemarrer » : relancer une app deja peinte rejoue le boot
 * a nu (cf. `useOtaUpdates`). On invite a fermer puis rouvrir.
 */

type Kind = "downloaded" | "applied";

const CONTENT: Record<
  Kind,
  {
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    title: string;
    message: string;
  }
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
    message:
      "Les dernières améliorations sont installées. Vous profitez dès maintenant de la version la plus récente.",
  },
};

/** Fond sombre (essai) ou clair : bascule unique, le reste suit la palette. */
const DARK = true;

/** Carte en haut de l'ecran ou en bas, par-dessus la barre d'onglets (essai). */
const POSITION = "bottom" as "top" | "bottom";
/** En bas : ecart entre le bas de la carte et le bas visible de la barre. */
const BOTTOM_GAP = 7;

const PALETTE = DARK
  ? {
      card: "#141417",
      border: "rgba(255,255,255,0.08)",
      gradientStart: "#141417",
      gradientAlpha: "4d",
      badgeAlpha: "33",
      title: "#ffffff",
      message: "rgba(255,255,255,0.68)",
      closeBg: "rgba(255,255,255,0.12)",
      closeIcon: "rgba(255,255,255,0.75)",
      bar: "#ffffff" as string | null,
    }
  : {
      card: "#ffffff",
      border: "rgba(0,0,0,0.08)",
      gradientStart: "#ffffff",
      gradientAlpha: "1f",
      badgeAlpha: "14",
      title: "#111114",
      message: "#6b6b72",
      closeBg: "#f2f2f5",
      closeIcon: "#8e8e93",
      // Fond clair : trait de la teinte de la carte.
      bar: null as string | null,
    };

/** Duree d'affichage avant retrait automatique (trait de decompte). */
const VISIBLE_MS: Record<Kind, number> = { downloaded: 8000, applied: 5000 };
/** Laisse la home se peindre avant d'annoncer la mise a jour appliquee. */
const APPLIED_DELAY_MS = 700;
/** Marge laterale du trait de decompte, a l'interieur de la carte. */
const TRACK_INSET = 18;

/**
 * Apercu en developpement (Expo Go, Metro) : les OTA n'y existent pas, la carte
 * s'y affiche donc d'office. « Mise a jour telechargee » au lancement (son
 * decompte boucle sans la fermer), « Application a jour » a sa fermeture, puis
 * de nouveau « telechargee » 3 s apres. Sans effet en build (`__DEV__` faux).
 */
const DEV_PREVIEW = false;

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
      // Apercu en boucle : rouge -> (fermeture) vert -> 3 s -> rouge...
      if (__DEV__ && DEV_PREVIEW) {
        if (closing === "downloaded") setTimeout(() => show("applied"), 400);
        else setTimeout(() => show("downloaded"), 3000);
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

  // Retrait automatique des deux cartes, trait de decompte a l'appui. En
  // apercu dev, la rouge ne se ferme pas : son decompte repart de zero.
  useEffect(() => {
    if (!kind) return;
    const loop = __DEV__ && DEV_PREVIEW && kind === "downloaded";
    let anim: Animated.CompositeAnimation | undefined;
    const run = () => {
      countdown.setValue(1);
      anim = Animated.timing(countdown, {
        toValue: 0,
        duration: VISIBLE_MS[kind],
        easing: Easing.linear,
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        if (!finished) return;
        if (loop) run();
        else hide();
      });
    };
    run();
    return () => anim?.stop();
  }, [kind, countdown, hide]);

  if (!kind) return null;
  const c = CONTENT[kind];

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        POSITION === "top"
          ? { top: insets.top + 2 }
          : // Survole la barre d'onglets (la recouvre), qui ne reserve qu'une
            // PART de la safe area (cf. `_layout`).
            { bottom: insets.bottom * TAB_BAR_INSET_RATIO + BOTTOM_GAP },
      ]}
    >
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  // Entre par le bord le plus proche.
                  outputRange: [POSITION === "top" ? -24 : 24, 0],
                }),
              },
              {
                scale: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Degrade sur tout le fond : couleur de fond a gauche (la pastille
            porte deja la teinte), teinte a droite. Rogne par son propre calque,
            pour ne pas couper l'ombre de la carte. */}
        <LinearGradient
          pointerEvents="none"
          colors={[PALETTE.gradientStart, `${c.tint}${PALETTE.gradientAlpha}`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
        <View
          style={[
            styles.badge,
            { backgroundColor: `${c.tint}${PALETTE.badgeAlpha}` },
          ]}
        >
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
          style={({ pressed }) => [
            styles.close,
            pressed && styles.closePressed,
          ]}
        >
          <Ionicons name="close" size={16} color={PALETTE.closeIcon} />
        </Pressable>

        {barWidth > 2 * TRACK_INSET && (
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.bar,
                {
                  backgroundColor: PALETTE.bar ?? c.tint,
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
    // Alignee sur les bords des cartes de plats du home.
    left: Theme.design.horizontalPadding,
    right: Theme.design.horizontalPadding,
    // Au-dessus des ecrans et des sheets, comme `OfflineBanner`.
    zIndex: 9999,
    elevation: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 23,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: PALETTE.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.border,
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
    color: PALETTE.title,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: PALETTE.message,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.closeBg,
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
