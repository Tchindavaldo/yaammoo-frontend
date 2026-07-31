import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { socketService } from "./socket";
import { withAck } from "./socketAck";
import { useAuth } from "../features/auth/context/AuthContext";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import { useOrders } from "../features/orders/hooks/useOrders";
import { useMerchant } from "../features/merchant/hooks/useMerchant";
import { useDriver } from "../features/driver/hooks/useDriver";
import { useMerchantWallet } from "../features/merchant/context/MerchantWalletContext";
import { useWallet } from "../features/wallet/context/WalletContext";
import { useFastFoods } from "../features/restaurants/hooks/useFastFoods";
import { useBonusContext } from "../features/bonus/context/BonusContext";

/**
 * Handlers globaux des events socket. Principe : chaque event PORTE sa donnée
 * (voir BACKEND/architecture/socket-events.md), le front l'injecte directement
 * dans le bon contexte — PAS de refetch HTTP.
 *
 * Exception : au (re)connect on fait un refresh global silencieux pour rattraper
 * les events fire-and-forget non rejoués pendant une déconnexion (les events
 * fiabilisés, eux, sont rejoués par le backend avec __eventId + ACK).
 */
export const useSocketEvents = () => {
  const { userData, setUserData } = useAuth();

  // Patch LOCAL du rôle livreur depuis le payload socket (pas de GET) : maj de
  // isDriver/driverId sur userData → l'onglet Livraisons apparaît/disparaît en
  // temps réel. Le payload backend porte l'état résultant du user.
  const patchDriverRole = (role: { isDriver?: boolean; driverId?: string }) => {
    if (!userData) return;
    setUserData({
      ...userData,
      isDriver: role.isDriver,
      driverId: role.driverId,
    } as typeof userData);
  };
  const {
    refresh: refreshNotifications,
    addFromSocket: addNotifFromSocket,
  } = useNotifications();
  const {
    refresh: refreshOrders,
    upsertOrderFromSocket: upsertClientOrder,
    upsertOrdersFromSocket: upsertClientOrders,
  } = useOrders();
  const {
    refresh: refreshMerchant,
    upsertOrderFromSocket: upsertMerchantOrder,
    upsertOrdersFromSocket: upsertMerchantOrders,
    upsertMenuFromSocket: upsertMerchantMenu,
    removeMenuFromSocket: removeMerchantMenu,
  } = useMerchant();
  const {
    refresh: refreshDriver,
    upsertOrderFromSocket: upsertDriverOrder,
    upsertOrdersFromSocket: upsertDriverOrders,
    notifyApplicationEvent,
  } = useDriver();
  const { applyEvent: applyWalletEvent, handleWithdrawalEvent } =
    useMerchantWallet();
  const {
    refresh: refreshWallet,
    upsertTransactionFromSocket: upsertClientTransaction,
  } = useWallet();
  const {
    refresh: refreshFastFoods,
    upsertMenuFromSocket: upsertGlobalMenu,
    removeMenuFromSocket: removeGlobalMenu,
    upsertFastFoodFromSocket: upsertGlobalFastFood,
    applyDeliveryOffer,
    clearDeliveryOfferForBonus,
  } = useFastFoods();
  const {
    applyClaimPayload: applyBonusPayload,
    applyBonusStats,
    applyArmPayload,
    applyRedeemedPayload,
    applyActivationPayload,
    refresh: refreshBonuses,
  } = useBonusContext();
  const socket = socketService.getSocket();

  useEffect(() => {
    if (!userData || !socket) return;

    /**
     * Rattrapage silencieux de l'état : events fire-and-forget manqués
     * hors-ligne, et tout ce qui a bougé pendant que l'app ne recevait rien.
     *
     * Les bonus en font partie : ouvrir l'app depuis une notification push
     * (identifiants provisionnés, offre désactivée) place l'event AVANT que le
     * front puisse l'entendre. Le rejeu des events fiabilisés ne suffit pas —
     * `bonus.activation_changed` n'en fait pas partie, et `withAck` ignore un
     * `__eventId` déjà mémorisé dans la session.
     */
    const catchUp = () => {
      refreshNotifications(true);
      refreshOrders(true);
      refreshMerchant(false);
      refreshDriver(false);
      refreshBonuses(true);
    };

    const handleConnect = () => {
      socket.emit("join_user", userData?.uid);
      catchUp();
    };

    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();
    else socket.connect();

    /**
     * Retour au premier plan. L'OS (iOS surtout) gèle le JS en arrière-plan et
     * peut couper la websocket sans que socket.io s'en aperçoive : au réveil la
     * socket paraît vivante, aucun `connect` ne part, donc AUCUN catch-up — les
     * events reçus pendant la mise en veille n'apparaissent jamais.
     *
     * Trois cas, du plus simple au plus retors :
     *  1. lien mort et connu comme tel → `connect()`, son handler fait le reste ;
     *  2. lien vivant → re-`join_user` (rejeu des events non acquittés) + catch-up ;
     *  3. lien « zombie » (vu connecté, en réalité coupé) → détecté par le ping
     *     ci-dessous, qui force alors une vraie reconnexion.
     */
    // Garde anti-rafale : basculer rapidement entre deux apps émet plusieurs
    // `active` d'affilée, chacun déclenchant 5 requêtes. On espace les
    // rattrapages sans jamais bloquer celui qui suit une vraie mise en veille.
    let lastCatchUp = 0;
    const CATCH_UP_COOLDOWN_MS = 10_000;
    /** Au-delà, on considère le lien mort même s'il se dit connecté. */
    const PING_TIMEOUT_MS = 4_000;

    const handleAppState = (state: AppStateStatus) => {
      if (state !== "active") return;
      const now = Date.now();
      if (now - lastCatchUp < CATCH_UP_COOLDOWN_MS) return;
      lastCatchUp = now;

      if (!socket.connected) {
        socket.connect();
        return;
      }

      // Socket vue comme vivante — mais après une mise en veille l'OS a pu tuer
      // le lien sans que socket.io le sache (« zombie ») : les events émis
      // pendant ce temps ne sont NI reçus, NI rejoués, faute de reconnexion.
      //
      // Décisif pendant un paiement : l'utilisateur QUITTE l'app pour saisir son
      // code USSD, donc `payment.settled` tombe presque toujours en arrière-plan.
      // Sans ce rattrapage, l'overlay peut tourner alors que le paiement a abouti.
      //
      // On re-`join_user` systématiquement : idempotent côté serveur, et c'est ce
      // qui déclenche le REJEU des events fiabilisés non acquittés — dont
      // `payment.settled`. `withAck` dédoublonne ceux déjà traités.
      socket.emit("join_user", userData?.uid);
      catchUp();

      // Détection du lien « zombie ». On n'interroge PAS le serveur (aucun
      // handler applicatif ne répondrait) : on sonde le ping/pong natif du
      // moteur Engine.IO, seul signe de vie fiable. Silence prolongé → le lien
      // est mort malgré `socket.connected`, on le recycle pour déclencher un
      // vrai `connect` (et donc le rejeu backend).
      const engine: any = (socket as any).io?.engine;
      if (!engine) return;
      let alive = false;
      const onPacket = () => {
        alive = true;
      };
      engine.once("packet", onPacket);
      setTimeout(() => {
        engine.off?.("packet", onPacket);
        if (!alive && socket.connected) {
          socket.disconnect();
          socket.connect();
        }
      }, PING_TIMEOUT_MS);
    };

    const appStateSub = AppState.addEventListener("change", handleAppState);

    // ⚠️ Tous les handlers ci-dessous sont enrobés de `withAck` : dédoublonnage
    // via __eventId + ACK obligatoire (sinon le backend rejoue l'event en boucle).

    // ── Commandes client ──────────────────────────────────────────────
    // newUserOrder { data: order } → upsert local
    socket.on("newUserOrder", withAck((data: any) => {
      console.log("📥 newUserOrder:", data);
      if (data?.data) upsertClientOrder(data.data);
    }));
    // userOrderUpdated { data: order } → upsert local
    socket.on("userOrderUpdated", withAck((data: any) => {
      console.log("🔄 userOrderUpdated:", data);
      if (data?.data) upsertClientOrder(data.data);
    }));
    // userOrdersUpdated { orders: order[] } → upsert lot
    socket.on("userOrdersUpdated", withAck((data: any) => {
      console.log("📦 userOrdersUpdated:", data);
      if (Array.isArray(data?.orders)) upsertClientOrders(data.orders);
    }));

    // ── Commandes marchand ────────────────────────────────────────────
    // newFastFoodOrder { data: order }
    socket.on("newFastFoodOrder", withAck((data: any) => {
      console.log("🍔 newFastFoodOrder:", data);
      if (data?.data) upsertMerchantOrder(data.data);
    }));
    // newFastFoodOrders { data: order[] }
    socket.on("newFastFoodOrders", withAck((data: any) => {
      console.log("🍔 newFastFoodOrders:", data);
      if (Array.isArray(data?.data)) upsertMerchantOrders(data.data);
    }));
    // fastFoodOrderUpdated { data: order }
    socket.on("fastFoodOrderUpdated", withAck((data: any) => {
      console.log("🍔 fastFoodOrderUpdated:", data);
      if (data?.data) upsertMerchantOrder(data.data);
    }));
    // fastFoodOrdersUpdated { orders: order[] }
    socket.on("fastFoodOrdersUpdated", withAck((data: any) => {
      console.log("🍔 fastFoodOrdersUpdated:", data);
      if (Array.isArray(data?.orders)) upsertMerchantOrders(data.orders);
    }));
    // ordersRankUpdated { orders: order[] }
    socket.on("ordersRankUpdated", withAck((data: any) => {
      console.log("🔢 ordersRankUpdated:", data);
      if (Array.isArray(data?.orders)) upsertMerchantOrders(data.orders);
    }));

    // ── Commandes livreur (déléguées) ─────────────────────────────────
    // driverOrderAssigned { data: order } → une commande vient d'être déléguée
    socket.on("driverOrderAssigned", withAck((data: any) => {
      console.log("🛵 driverOrderAssigned:", data);
      if (data?.data) upsertDriverOrder(data.data);
    }));
    // driverOrdersAssigned { data: order[] } → lot délégué
    socket.on("driverOrdersAssigned", withAck((data: any) => {
      console.log("🛵 driverOrdersAssigned:", data);
      if (Array.isArray(data?.data)) upsertDriverOrders(data.data);
    }));
    // driverOrderUpdated { data: order } → statut d'une commande déléguée
    socket.on("driverOrderUpdated", withAck((data: any) => {
      console.log("🛵 driverOrderUpdated:", data);
      if (data?.data) upsertDriverOrder(data.data);
    }));

    // ── Demandes de livraison (temps réel) ────────────────────────────
    // driverApplicationCreated { data: application } → nouvelle demande (marchand)
    socket.on("driverApplicationCreated", withAck((data: any) => {
      console.log("📨 driverApplicationCreated:", data);
      if (data?.data) notifyApplicationEvent({ type: "created", application: data.data });
    }));
    // driverApplicationDecided { data: application } → accepté/refusé (candidat)
    socket.on("driverApplicationDecided", withAck((data: any) => {
      console.log("📨 driverApplicationDecided:", data);
      if (data?.data) notifyApplicationEvent({ type: "decided", application: data.data });
      // Accepté → patch LOCAL du rôle (onglet en direct) depuis le payload.
      // Le backend joint role: { isDriver, driverId }.
      if (data?.data?.status === "accepted" && data?.role) {
        patchDriverRole(data.role);
      }
    }));
    // driverRemoved { data: { fastFoodId }, role: { isDriver, driverId } }
    socket.on("driverRemoved", withAck((data: any) => {
      console.log("📨 driverRemoved:", data);
      if (data?.data?.fastFoodId) notifyApplicationEvent({ type: "removed", fastFoodId: data.data.fastFoodId });
      // Patch LOCAL du rôle : si c'était sa dernière boutique, isDriver=false
      // (onglet masqué en direct). Le backend joint role: { isDriver, driverId }.
      if (data?.role) patchDriverRole(data.role);
    }));

    // ── Échos MARCHAND (sync multi-device de la boutique) ──
    // merchantDriverApplicationDecided { data: application } → une demande a été
    // acceptée/refusée depuis un autre appareil du même marchand.
    socket.on("merchantDriverApplicationDecided", withAck((data: any) => {
      console.log("🏪 merchantDriverApplicationDecided:", data);
      if (data?.data) notifyApplicationEvent({ type: "merchant_decided", application: data.data });
    }));
    // merchantDriverRemoved { data: { driverId } } → un livreur retiré ailleurs.
    socket.on("merchantDriverRemoved", withAck((data: any) => {
      console.log("🏪 merchantDriverRemoved:", data);
      if (data?.data?.driverId) notifyApplicationEvent({ type: "merchant_driver_removed", driverId: data.data.driverId });
    }));

    // ── Menus marchand ────────────────────────────────────────────────
    // newMenu { data: menu } / newFastFoodMenu { menu } → upsert
    socket.on("newMenu", withAck((data: any) => {
      console.log("🥘 newMenu:", data);
      if (data?.data) upsertMerchantMenu(data.data);
    }));
    socket.on("newFastFoodMenu", withAck((data: any) => {
      console.log("🥘 newFastFoodMenu:", data);
      if (data?.menu) upsertMerchantMenu(data.menu);
    }));
    // fastFoodMenuUpdated { menuId, menu } → upsert
    socket.on("fastFoodMenuUpdated", withAck((data: any) => {
      console.log("🥘 fastFoodMenuUpdated:", data);
      if (data?.menu) upsertMerchantMenu(data.menu);
    }));
    // fastFoodMenuDeleted { fastFood, menuId } → remove
    socket.on("fastFoodMenuDeleted", withAck((data: any) => {
      console.log("🗑️ fastFoodMenuDeleted:", data);
      if (data?.menuId) removeMerchantMenu(data.menuId);
    }));

    // ── Menus globaux (liste restaurants) ─────────────────────────────
    // newGlobalMenu { menu } / globalMenuUpdated { menuId, menu } → upsert
    socket.on("newGlobalMenu", withAck((data: any) => {
      console.log("🌎 newGlobalMenu:", data);
      if (data?.menu) upsertGlobalMenu(data.menu);
    }));
    socket.on("globalMenuUpdated", withAck((data: any) => {
      console.log("🌎 globalMenuUpdated:", data);
      if (data?.menu) upsertGlobalMenu(data.menu);
    }));
    // globalMenuDeleted { fastFood, menuId } → remove
    socket.on("globalMenuDeleted", withAck((data: any) => {
      console.log("🌎 globalMenuDeleted:", data);
      const ffId = data?.fastFood?.id ?? data?.fastFood;
      if (ffId && data?.menuId) removeGlobalMenu(ffId, data.menuId);
    }));

    // ── Fastfood ──────────────────────────────────────────────────────
    // newFastfood { fastFood } → upsert dans la liste
    socket.on("newFastfood", withAck((data: any) => {
      console.log("🏬 newFastfood:", data);
      if (data?.fastFood) upsertGlobalFastFood(data.fastFood);
    }));

    // fastfoodUpdated { fastFood } → mêmes données que newFastfood. upsert
    // (l'édition d'une boutique met à jour son image/horaires sur la home).
    socket.on("fastfoodUpdated", withAck((data: any) => {
      console.log("🏬 fastfoodUpdated:", data);
      const ff = data?.fastFood ?? data;
      if (ff?.id) upsertGlobalFastFood(ff);
    }));

    // ── Transactions / Wallet ─────────────────────────────────────────
    // newTransaction { data: transaction } → page transactions client (WalletContext).
    socket.on("newTransaction", withAck((data: any) => {
      console.log("💰 newTransaction:", data);
      if (data?.data) upsertClientTransaction(data.data);
    }));
    // bonus.stats_updated : solde recalculé de TOUS les bonus (map par id).
    // Seul event faisant autorité sur le solde — émis au claim, à chaque
    // nouvelle commande et à tout changement de statut (annulation).
    socket.on("bonus.stats_updated", withAck((data: any) => {
      console.log("📊 bonus.stats_updated:", data);
      applyBonusStats(data?.data?.bonusStats);
    }));
    // bonus.claimed : écho du claim (code, statut). Ne porte pas le solde.
    socket.on("bonus.claimed", withAck((data: any) => {
      console.log("🎁 bonus.claimed:", data);
      if (data?.data) applyBonusPayload(data.data);
    }));
    // bonus.reward_credentials : récompense provisionnée (identifiants Netflix…),
    // souvent longtemps après le claim → d'où l'état bonus en contexte global.
    socket.on("bonus.reward_credentials", withAck((data: any) => {
      console.log("🎁 bonus.reward_credentials:", data);
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
      console.log("⚡ bonus.armed:", data);
      handleArmEvent(data);
    }));
    socket.on("bonus.disarmed", withAck((data: any) => {
      console.log("⚡ bonus.disarmed:", data);
      handleArmEvent(data);
    }));
    // bonus.redeemed : une utilisation du code vient d'être consommée →
    // compteurs recalculés (usageCount / remainingUses / redeemed).
    socket.on("bonus.redeemed", withAck((data: any) => {
      console.log("🎟️ bonus.redeemed:", data);
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
      console.log("🆕 bonus.created");
      refreshBonuses(true);
    }));
    // bonus.activation_changed : le bonus a été activé/désactivé côté émetteur.
    // Broadcast GLOBAL (pas de room) → reçu même pour un bonus absent de la
    // liste locale, cas traité dans applyActivationPayload (refetch silencieux).
    socket.on("bonus.activation_changed", withAck((data: any) => {
      console.log("🔔 bonus.activation_changed:", data);
      const p = data?.data;
      if (!p) return;
      applyActivationPayload(p);
      // Désactivé : l'offre de livraison qu'il portait ne vaut plus rien au
      // checkout — même effacement ciblé que sur un bonus épuisé.
      if (p.active === false) clearDeliveryOfferForBonus(p.bonusId);
    }));
    // wallet.credited : gain marchand (payin) → patch local du solde.
    socket.on("wallet.credited", withAck((data: any) => {
      console.log("🟢 wallet.credited:", data);
      applyWalletEvent({
        type: "credit",
        amount: Number(data?.amount) || 0,
        date: data?.createdAt,
      });
    }));
    // wallet.withdrawal : retrait (3 états, même withdrawalId) → patch solde + overlay.
    socket.on("wallet.withdrawal", withAck((data: any) => {
      console.log("🔴 wallet.withdrawal:", data);
      handleWithdrawalEvent({
        withdrawalId: data?.withdrawalId,
        status: data?.status,
        amount: Number(data?.amount) || 0,
        newBalance:
          typeof data?.newBalance === "number" ? data.newBalance : undefined,
        reason: data?.reason,
        createdAt: data?.createdAt,
      });
    }));

    // ── Notifications ─────────────────────────────────────────────────
    // newNotification { notification } → injection directe.
    socket.on("newNotification", withAck((data: any) => {
      if (data?.notification) addNotifFromSocket(data.notification);
      else if (data?.id) addNotifFromSocket(data);
    }));
    // isRead { notificationId } → sync silencieux multi-device.
    socket.on("isRead", withAck((data: any) => {
      console.log("📧 isRead:", data);
      refreshNotifications(true);
    }));

    // ── Suivi de livraison (fire-and-forget) ──────────────────────────
    socket.on("newPeriodKeyDelivering", withAck((data: any) => {
      console.log("🚀 newPeriodKeyDelivering:", data?.periodKey);
    }));
    socket.on("removePeriodKeyDelivering", withAck((data: any) => {
      console.log("✅ removePeriodKeyDelivering:", data?.periodKey);
    }));
    socket.on("newClientIdDelivering", withAck((data: any) => {
      console.log("🛵 newClientIdDelivering:", data?.clientId);
    }));
    socket.on("removeClientIdDelivering", withAck((data: any) => {
      console.log("🅿️ removeClientIdDelivering:", data?.clientId);
    }));

    return () => {
      appStateSub.remove();
      socket.off("connect", handleConnect);
      socket.off("newUserOrder");
      socket.off("userOrderUpdated");
      socket.off("userOrdersUpdated");
      socket.off("driverOrderAssigned");
      socket.off("driverOrdersAssigned");
      socket.off("driverOrderUpdated");
      socket.off("driverApplicationCreated");
      socket.off("driverApplicationDecided");
      socket.off("driverRemoved");
      socket.off("merchantDriverApplicationDecided");
      socket.off("merchantDriverRemoved");
      socket.off("newFastFoodOrder");
      socket.off("newFastFoodOrders");
      socket.off("fastFoodOrderUpdated");
      socket.off("fastFoodOrdersUpdated");
      socket.off("ordersRankUpdated");
      socket.off("newMenu");
      socket.off("newFastFoodMenu");
      socket.off("fastFoodMenuUpdated");
      socket.off("fastFoodMenuDeleted");
      socket.off("newGlobalMenu");
      socket.off("globalMenuUpdated");
      socket.off("globalMenuDeleted");
      socket.off("newFastfood");
      socket.off("fastfoodUpdated");
      socket.off("newTransaction");
      socket.off("bonus.stats_updated");
      socket.off("bonus.claimed");
      socket.off("bonus.reward_credentials");
      socket.off("bonus.armed");
      socket.off("bonus.disarmed");
      socket.off("bonus.redeemed");
      socket.off("bonus.activation_changed");
      socket.off("bonus.created");
      socket.off("wallet.credited");
      socket.off("wallet.withdrawal");
      socket.off("newNotification");
      socket.off("isRead");
      socket.off("newPeriodKeyDelivering");
      socket.off("removePeriodKeyDelivering");
      socket.off("newClientIdDelivering");
      socket.off("removeClientIdDelivering");
    };
  }, [userData, socket]);
};
