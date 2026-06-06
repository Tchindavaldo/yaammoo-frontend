import React, { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Config } from "@/src/api/config";
import { useAuth } from "../auth/context/AuthContext";
import { useOrders } from "../orders/hooks/useOrders";
import { useMerchant } from "../merchant/hooks/useMerchant";
import { useNotifications } from "../notifications/hooks/useNotifications";

interface SocketContextType {
  socket: Socket | null;
  registerPaymentHandler: (handler: (data: any) => void) => void;
  unregisterPaymentHandler: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  registerPaymentHandler: () => {},
  unregisterPaymentHandler: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userData } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const paymentHandlerRef = useRef<((data: any) => void) | null>(null);

  // Hooks to update data on socket events
  const { refresh: refreshOrders } = useOrders();
  const { refresh: refreshMerchant } = useMerchant();
  const { refresh: refreshNotifications } = useNotifications();

  useEffect(() => {
    if (!userData) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(Config.apiUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      // Identical to initSessionSocketService
      socket.emit("initSession", { userId: userData?.uid });
    });

    // User Order Events
    socket.on("newUserOrder", (data) => {
      console.log("📥 newUserOrder:", data);
      refreshOrders(true);
    });
    socket.on("newUserOrders", (data) => {
      console.log("📦 newUserOrders:", data);
      refreshOrders(true);
    });
    socket.on("userOrderUpdated", (data) => {
      console.log("🔄 userOrderUpdated:", data);
      refreshOrders(true);
    });
    socket.on("ordersRankUpdated", (data) => {
      console.log("🔢 ordersRankUpdated:", data);
      refreshOrders(true);
    });

    // Merchant Order Events
    socket.on("newFastFoodOrder", (data) => {
      console.log("🍔 newFastFoodOrder:", data);
      refreshMerchant();
    });
    socket.on("newFastFoodOrders", (data) => {
      console.log("🍔 newFastFoodOrders:", data);
      refreshMerchant();
    });
    socket.on("fastFoodOrderUpdated", (data) => {
      console.log("🍔 fastFoodOrderUpdated:", data);
      refreshMerchant();
    });

    socket.on("fastFoodMenuUpdated", (data) => {
      console.log("🥘 fastFoodMenuUpdated:", data);
      refreshMerchant();
    });

    // Transaction Events
    socket.on("newTransaction", (data) => {
      console.log("💰 newTransaction:", data);
      refreshMerchant(); // Portefeuille check
    });

    // Notification Events
    socket.on("isRead", (data) => {
      console.log("📧 Notification isRead:", data);
      refreshNotifications();
    });

    // Payment Events (Mobile Money)
    socket.on("payment.settled", (data) => {
      console.log("💳 payment.settled:", data);
      if (paymentHandlerRef.current) {
        paymentHandlerRef.current(data);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userData]);

  const registerPaymentHandler = (handler: (data: any) => void) => {
    paymentHandlerRef.current = handler;
  };

  const unregisterPaymentHandler = () => {
    paymentHandlerRef.current = null;
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        registerPaymentHandler,
        unregisterPaymentHandler,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
