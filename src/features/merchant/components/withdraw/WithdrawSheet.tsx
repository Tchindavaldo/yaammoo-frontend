"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import type { useWithdraw } from "../../hooks/useWithdraw";
import {
  WalletBalances,
  balanceKey,
  formatF,
  formatPhone,
  groupThousands,
  walletLabel,
} from "../../services/walletNetwork";
import { WithdrawAmountCapsule } from "./WithdrawAmountCapsule";
import { WITHDRAW_SHEET_HEIGHT, ws } from "./WithdrawSheet.styles";
import { WithdrawStatusCover } from "./WithdrawStatusCover";
import {
  FeePercents,
  WithdrawReceiveStep,
  WithdrawRecapStep,
  WithdrawSourceStep,
} from "./WithdrawSteps";

interface WithdrawSheetProps {
  /** Etat et actions du retrait (`useWithdraw`). */
  w: ReturnType<typeof useWithdraw>;
  balances: WalletBalances;
  /** Taux interreseau indicatifs (`/wallet/stats`), absents sur un ancien backend. */
  percents: FeePercents;
}

/**
 * Feuille de RETRAIT en trois etapes, sur le modele du sheet du panier groupe
 * (`CartGroupedDeliverySheet`) : un seul `Modal`, hauteur fixe, stepper a
 * points, pied « retour + action ».
 *   1. solde a debiter ;
 *   2. numero de reception (ceux de la boutique) + montant dans la capsule ;
 *   3. recapitulatif, bouton « Retirer ».
 * Pendant la requete puis au succes, un cache couvre toute la feuille (flou
 * sur iPhone, blanc sur Android).
 */
export const WithdrawSheet: React.FC<WithdrawSheetProps> = ({ w, balances, percents }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const state = w.withdrawState;
  const open = state !== "idle";

  // Fermeture : on joue la sortie AVANT de remettre le retrait a zero, sinon
  // la feuille se viderait sous les yeux pendant son fondu.
  const [closing, setClosing] = React.useState(false);
  const visible = open && !closing;
  const [mounted, setMounted] = React.useState(visible);
  const anim = React.useRef(new Animated.Value(0)).current;
  const closingRef = React.useRef(false);
  closingRef.current = closing;
  const resetRef = React.useRef(w.resetWithdraw);
  resetRef.current = w.resetWithdraw;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 11 }).start();
      return;
    }
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      if (closingRef.current) {
        setClosing(false);
        resetRef.current();
      }
    });
  }, [visible, anim]);

  const close = React.useCallback(() => setClosing(true), []);

  // Capsule flottante du montant (etape 2) : fermee des qu'on quitte l'etape.
  const [amountOpen, setAmountOpen] = React.useState(false);
  React.useEffect(() => {
    if (state !== "receive") setAmountOpen(false);
  }, [state]);
  const closeAmount = React.useCallback(() => setAmountOpen(false), []);

  /** Voile / retour Android : rien pendant la requete, sinon fermeture. */
  const handleDismiss = React.useCallback(() => {
    if (state === "waiting") return;
    if (amountOpen) {
      setAmountOpen(false);
      return;
    }
    close();
  }, [state, amountOpen, close]);

  if (!mounted) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [900, 0] });
  const source = w.sourceNetwork;
  const target = w.targetNetwork;
  const phone = target ? w.numbers[target] : undefined;
  const sourceBalance = source ? balances[balanceKey(source)] : 0;
  const sent = w.quote ? w.quote.sentAmount ?? w.quote.amount : 0;
  const busy = state === "waiting" || state === "processing";
  const onRecap = state === "recap" || busy || state === "completed";

  const coverStatus = busy ? "pending" : state === "completed" ? "success" : null;
  const coverDetail =
    state === "completed"
      ? t("{{a}} envoyés au {{b}} ({{c}}). Le montant peut mettre jusqu'à 24 h pour arriver.", {
          a: formatF(sent),
          b: formatPhone(phone),
          c: walletLabel(target),
        })
      : t("{{a}} vers {{b}}. Ne fermez pas l'application.", { a: formatF(sent), b: formatPhone(phone) });

  const backBtn = (onPress: () => void, icon: "close" | "arrow-back") => (
    <TouchableOpacity
      style={ws.backBtn}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
      accessibilityLabel={icon === "close" ? t("Fermer") : t("Retour")}
    >
      <Ionicons name={icon} size={20} color={DS.slate600} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={handleDismiss}>
      {/* Flou Android (SDK 57) : le voile de la capsule floute la feuille. */}
      <BlurScope>
        <Animated.View style={[ws.scrim, { opacity: anim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            ws.sheet,
            {
              // Pied pose sur la bande safe-area (source unique, R19).
              height: WITHDRAW_SHEET_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          <BlurTarget style={ws.body}>
            {state === "source" && (
              <WithdrawSourceStep balances={balances} source={source} onSelect={w.setSourceNetwork} />
            )}
            {state === "receive" && (
              <WithdrawReceiveStep
                balances={balances}
                source={source}
                target={target}
                onSelect={w.setTargetNetwork}
                numbers={w.numbers}
                numbersLoading={w.numbersLoading}
                percents={percents}
              />
            )}
            {onRecap && (
              <WithdrawRecapStep
                source={source}
                target={target}
                phone={phone}
                quote={w.quote}
                percents={percents}
              />
            )}

            <View style={ws.spacer} />

            <View style={ws.actionRow}>
              {state === "source" && (
                <>
                  {backBtn(close, "close")}
                  <TouchableOpacity style={ws.primaryBtn} onPress={w.goReceive} activeOpacity={0.9}>
                    <Text style={ws.primaryBtnLabel}>{t("Continuer")}</Text>
                  </TouchableOpacity>
                </>
              )}

              {state === "receive" && (
                <>
                  {backBtn(w.goBack, "arrow-back")}
                  {/* Capsule sombre : le montant n'y est qu'un LEURRE. Le tap
                      ouvre la capsule flottante, seul vrai champ. */}
                  <View style={ws.amountCapsule}>
                    <Ionicons name="wallet-outline" size={18} color={DS.onInkMuted} />
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <TextInput
                        style={[ws.amountDecoy, amountOpen && ws.amountDecoyMuted]}
                        value={w.amount ? groupThousands(w.amount) : ""}
                        placeholder={t("Montant")}
                        placeholderTextColor={amountOpen ? "transparent" : DS.onInkFaint}
                        editable={false}
                        showSoftInputOnFocus={false}
                        caretHidden
                        pointerEvents="none"
                      />
                      <Pressable style={StyleSheet.absoluteFill} onPress={() => setAmountOpen(true)} />
                    </View>
                    <Text style={ws.maxChip}>{t("max {{a}}", { a: formatF(sourceBalance) })}</Text>
                    <TouchableOpacity
                      style={ws.capsuleBtn}
                      onPress={w.goRecap}
                      disabled={w.quoteLoading}
                      activeOpacity={0.85}
                    >
                      {w.quoteLoading ? (
                        <ActivityIndicator size={18} color={DS.onInk} />
                      ) : (
                        <Ionicons name="arrow-forward" size={18} color={DS.onInk} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {onRecap && (
                <>
                  {backBtn(w.goBack, "arrow-back")}
                  <TouchableOpacity
                    style={ws.primaryBtn}
                    onPress={w.confirmWithdraw}
                    disabled={busy || state === "completed"}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="arrow-up" size={18} color={DS.onInk} />
                    <Text style={ws.primaryBtnLabel}>{t("Retirer {{a}}", { a: formatF(sent) })}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurTarget>

          {/* Cache « en cours » / « reussi » sur TOUTE la feuille. */}
          <WithdrawStatusCover status={coverStatus} detail={coverDetail} onClose={close} />
          <SafeAreaDebugBand />
        </Animated.View>

        {/* Capsule flottante, rendue HORS de la feuille, par-dessus. */}
        <WithdrawAmountCapsule
          visible={amountOpen}
          value={w.amount}
          onChange={w.setAmount}
          maxLabel={t("max {{a}}", { a: formatF(sourceBalance) })}
          onClose={closeAmount}
        />
      </BlurScope>
      {/* Toast global au premier plan (Android). */}
      <GlobalToastHost modal />
    </Modal>
  );
};
