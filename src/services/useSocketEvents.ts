import { useEffect } from "react";
import { socketService } from "./socket";
import { withAck } from "./socketAck";
import { useAuth } from "../features/auth/context/AuthContext";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import { useOrders } from "../features/orders/hooks/useOrders";
import { useMerchant } from "../features/merchant/hooks/useMerchant";
import { useMerchantWallet } from "../features/merchant/context/MerchantWalletContext";
import { useFastFoods } from "../features/restaurants/hooks/useFastFoods";

export const useSocketEvents = () => {
  const { userData } = useAuth();
  const { refresh: refreshNotifications, addFromSocket: addNotifFromSocket } = useNotifications();
  const { refresh: refreshOrders } = useOrders();
  const { refresh: refreshMerchant } = useMerchant();
  const { applyEvent: applyWalletEvent, handleWithdrawalEvent } = useMerchantWallet();
  const { refresh: refreshFastFoods } = useFastFoods();
  const socket = socketService.getSocket();

  useEffect(() => {
    if (!userData || !socket) return;

    const handleConnect = () => {
      socket.emit("join_user", userData?.uid);
      // Rattrape ce qui a pu être manqué pendant que le socket était déconnecté
      // (app killed → tap push → démarrage, reprise après long background, coupure réseau).
      refreshNotifications(true);
      refreshOrders(true);
      refreshMerchant(false);
    };

    socket.on("connect", handleConnect);

    if (socket.connected) handleConnect();
    else socket.connect();

    // ⚠️ Tous les handlers ci-dessous sont enrobés de `withAck` : dédoublonnage
    // via __eventId + ACK obligatoire (sinon le backend rejoue l'event en boucle).

    // User Order Events (Identical to UserOrderSocketService)
    socket.on("newUserOrder", withAck((data) => {
      console.log("📥 newUserOrder:", data);
      refreshOrders();
    }));
    socket.on("newUserOrders", withAck((data) => {
      console.log("📦 newUserOrders:", data);
      refreshOrders();
    }));
    socket.on("userOrderUpdated", withAck((data) => {
      console.log("🔄 userOrderUpdated:", data);
      refreshOrders();
    }));

    // Merchant Order Events (Identical to FastFoodOrderSocketService)
    socket.on("newFastFoodOrder", withAck((data) => {
      console.log("🍔 newFastFoodOrder:", data);
      refreshMerchant(false);
    }));
    socket.on("newFastFoodOrders", withAck((data) => {
      console.log("🍔 newFastFoodOrders:", data);
      refreshMerchant(false);
    }));
    socket.on("fastFoodOrderUpdated", withAck((data) => {
      console.log("🍔 fastFoodOrderUpdated:", data);
      refreshMerchant(false);
    }));

    socket.on("fastFoodMenuUpdated", withAck((data) => {
      console.log("🥘 fastFoodMenuUpdated:", data);
      refreshMerchant(false);
    }));

    socket.on("newFastFoodMenu", withAck((data) => {
      console.log("🥘 newFastFoodMenu:", data);
      refreshMerchant(false);
    }));

    socket.on("globalMenuUpdated", withAck((data) => {
      console.log("🌎 globalMenuUpdated:", data);
      refreshFastFoods();
    }));

    socket.on("newGlobalMenu", withAck((data) => {
      console.log("🌎 newGlobalMenu:", data);
      refreshFastFoods();
    }));

    // Transaction Events
    socket.on("newTransaction", withAck((data) => {
      console.log("💰 newTransaction:", data);
      refreshMerchant(false); // Updates Wallet
    }));

    // Wallet Events — patch local du store (pas de refetch).
    // wallet.credited : un gain (direction "payin").
    socket.on("wallet.credited", withAck((data: any) => {
      console.log("🟢 wallet.credited:", data);
      applyWalletEvent({
        type: "credit",
        amount: Number(data?.amount) || 0,
        date: data?.createdAt,
      });
    }));
    // wallet.withdrawal : un retrait, 3 états (pending/completed/failed) sur le
    // même withdrawalId. Le contexte patche le solde (sur completed) et notifie
    // l'overlay de retrait en cours.
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

    // Notification Events
    socket.on("isRead", withAck((data) => {
      console.log("📧 Notification isRead:", data);
      // Refresh silencieux — pas de spinner visible. L'optimistic update a déjà
      // rafraîchi l'UI instantanément ; ceci ne sert qu'à re-synchroniser depuis
      // un autre appareil / flux externe.
      refreshNotifications(true);
    }));
    socket.on("newNotification", withAck((data: any) => {
      // Injection directe — pas de refetch auto (seul le pull-to-refresh déclenche un fetch).
      if (data?.notification) addNotifFromSocket(data.notification);
      else if (data?.id) addNotifFromSocket(data);
    }));

    // Delivery Tracking
    socket.on("newPeriodKeyDelivering", withAck((data: any) => {
      console.log("🚀 Delivery period started:", data.periodKey);
    }));
    socket.on("removePeriodKeyDelivering", withAck((data: any) => {
      console.log("✅ Delivery period completed:", data.periodKey);
    }));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("newUserOrder");
      socket.off("newUserOrders");
      socket.off("userOrderUpdated");
      socket.off("newFastFoodOrder");
      socket.off("newFastFoodOrders");
      socket.off("fastFoodOrderUpdated");
      socket.off("fastFoodMenuUpdated");
      socket.off("newFastFoodMenu");
      socket.off("globalMenuUpdated");
      socket.off("newGlobalMenu");
      socket.off("newTransaction");
      socket.off("wallet.credited");
      socket.off("wallet.withdrawal");
      socket.off("isRead");
      socket.off("newNotification");
      socket.off("newPeriodKeyDelivering");
      socket.off("removePeriodKeyDelivering");
    };
  }, [userData, socket]);
};
