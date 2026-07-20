import { useEffect } from "react";
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
  } = useFastFoods();
  const { applyClaimPayload: applyBonusPayload, applyBonusStats } =
    useBonusContext();
  const socket = socketService.getSocket();

  useEffect(() => {
    if (!userData || !socket) return;

    const handleConnect = () => {
      socket.emit("join_user", userData?.uid);
      // Catch-up des events fire-and-forget manqués hors-ligne (silencieux).
      refreshNotifications(true);
      refreshOrders(true);
      refreshMerchant(false);
      refreshDriver(false);
    };

    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();
    else socket.connect();

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
