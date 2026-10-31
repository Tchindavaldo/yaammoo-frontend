import type { Socket } from "socket.io-client";
import { withAck } from "../socketAck";
import { logEvent } from "./logEvent";
import {
  toBalances,
  toWalletNetwork,
} from "../../features/merchant/services/walletNetwork";

type Fn = (...args: any[]) => unknown;

interface BonusWalletDeps {
  upsertClientTransaction: Fn;
  applyBonusStats: Fn;
  applyBonusPayload: Fn;
  applyArmPayload: Fn;
  applyDeliveryOffer: Fn;
  applyRedeemedPayload: Fn;
  clearDeliveryOfferForBonus: Fn;
  refreshBonuses: Fn;
  applyActivationPayload: Fn;
  applyWalletEvent: Fn;
  handleWithdrawalEvent: Fn;
}

const EVENTS = [
  "newTransaction",
  "bonus.stats_updated",
  "bonus.claimed",
  "bonus.reward_credentials",
  "bonus.armed",
  "bonus.disarmed",
  "bonus.redeemed",
  "bonus.activation_changed",
  "bonus.created",
  "wallet.credited",
  "wallet.withdrawal",
];

/**
 * Events socket TRANSACTIONS / BONUS / PORTEFEUILLE.
 * Sorti de `useSocketEvents.ts` (plafond de 500 lignes, R4).
 * @returns la fonction de désabonnement.
 */
export const registerBonusWalletEvents = (
  socket: Socket,
  {
    upsertClientTransaction,
    applyBonusStats,
    applyBonusPayload,
    applyArmPayload,
    applyDeliveryOffer,
    applyRedeemedPayload,
    clearDeliveryOfferForBonus,
    refreshBonuses,
    applyActivationPayload,
    applyWalletEvent,
    handleWithdrawalEvent,
  }: BonusWalletDeps,
) => {
  // ── Transactions / Wallet ─────────────────────────────────────────
  // newTransaction { data: transaction } → page transactions client (WalletContext).
  socket.on("newTransaction", withAck((data: any) => {
    logEvent("newTransaction:", data);
    if (data?.data) upsertClientTransaction(data.data);
  }));
  // bonus.stats_updated : solde recalculé de TOUS les bonus (map par id).
  // Seul event faisant autorité sur le solde — émis au claim, à chaque
  // nouvelle commande et à tout changement de statut (annulation).
  socket.on("bonus.stats_updated", withAck((data: any) => {
    logEvent("bonus.stats_updated:", data);
    applyBonusStats(data?.data?.bonusStats);
  }));
  // bonus.claimed : écho du claim (code, statut). Ne porte pas le solde.
  socket.on("bonus.claimed", withAck((data: any) => {
    logEvent("bonus.claimed:", data);
    if (data?.data) applyBonusPayload(data.data);
  }));
  // bonus.reward_credentials : récompense provisionnée (identifiants Netflix…),
  // souvent longtemps après le claim → d'où l'état bonus en contexte global.
  socket.on("bonus.reward_credentials", withAck((data: any) => {
    logEvent("bonus.reward_credentials:", data);
    if (data?.data) applyBonusPayload(data.data);
  }));
  // bonus.armed / bonus.disarmed : le user a activé/désactivé un bonus (ici
  // ou sur un autre appareil). Deux effets, d'où le double appel :
  //   1. l'état du bonus lui-même (`armed` + les bonus auto-désarmés) ;
  //   2. `deliveryOffer`, propagé aux fastfoods concernés — c'est ce qui rend
  //      la livraison offerte visible au checkout SANS refetch de /fastFood/all
  //      (route dont l'offre dépend du user, cf. architecture/bonus.md).
  const handleArmEvent = (data: any) => {
    const p = data?.data;
    if (!p) return;
    applyArmPayload(p);
    applyDeliveryOffer(p.deliveryOffer ?? null);
  };
  socket.on("bonus.armed", withAck((data: any) => {
    logEvent("bonus.armed:", data);
    handleArmEvent(data);
  }));
  socket.on("bonus.disarmed", withAck((data: any) => {
    logEvent("bonus.disarmed:", data);
    handleArmEvent(data);
  }));
  // bonus.redeemed : une utilisation du code vient d'être consommée →
  // compteurs recalculés (usageCount / remainingUses / redeemed).
  socket.on("bonus.redeemed", withAck((data: any) => {
    logEvent("bonus.redeemed:", data);
    const p = data?.data;
    if (!p) return;
    applyRedeemedPayload(p);
    // Épuisé : le code ne vaut plus rien, l'offre de livraison qu'il portait
    // doit disparaître du checkout — exactement comme un désarmement. Sans
    // ça, la livraison resterait affichée « Offert » alors que le bonus est
    // consommé, jusqu'au prochain GET /fastFood/all.
    const exhausted =
      p.redeemed === true ||
      (typeof p.remainingUses === "number" && p.remainingUses <= 0);
    if (exhausted) clearDeliveryOfferForBonus(p.bonusId);
  }));
  // bonus.created : un bonus vient d'être créé (broadcast global, SANS payload)
  // → seule option, refetch silencieux de la liste.
  socket.on("bonus.created", withAck(() => {
    logEvent("bonus.created");
    refreshBonuses(true);
  }));
  // bonus.activation_changed : le bonus a été activé/désactivé côté émetteur.
  // Broadcast GLOBAL (pas de room) → reçu même pour un bonus absent de la
  // liste locale, cas traité dans applyActivationPayload (refetch silencieux).
  socket.on("bonus.activation_changed", withAck((data: any) => {
    logEvent("bonus.activation_changed:", data);
    const p = data?.data;
    if (!p) return;
    applyActivationPayload(p);
    // Désactivé : l'offre de livraison qu'il portait ne vaut plus rien au
    // checkout — même effacement ciblé que sur un bonus épuisé.
    if (p.active === false) clearDeliveryOfferForBonus(p.bonusId);
  }));
  // wallet.credited : gain (payin) → patch local du solde ET du solde du réseau
  // crédité (`network` : MTN | ORANGEMONEY).
  socket.on("wallet.credited", withAck((data: any) => {
    logEvent("wallet.credited:", data);
    applyWalletEvent({
      type: "credit",
      amount: Number(data?.amount) || 0,
      date: data?.createdAt,
      network: toWalletNetwork(data?.network),
    });
  }));
  // wallet.withdrawal : retrait (3 états, même withdrawalId) → patch solde + overlay.
  // `amount` = montant reçu, `fee` = frais interréseau débités en plus.
  socket.on("wallet.withdrawal", withAck((data: any) => {
    logEvent("wallet.withdrawal:", data);
    handleWithdrawalEvent({
      withdrawalId: data?.withdrawalId,
      status: data?.status,
      amount: Number(data?.amount) || 0,
      fee: Number(data?.fee) || 0,
      newBalance:
        typeof data?.newBalance === "number" ? data.newBalance : undefined,
      newBalances: toBalances(data?.newBalances),
      reason: data?.reason,
      createdAt: data?.createdAt,
    });
  }));

  return () => EVENTS.forEach((e) => socket.off(e));
};
