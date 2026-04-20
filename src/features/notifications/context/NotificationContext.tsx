import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import axios from "axios";
import { Config } from "../../../api/config";
import { useAuth } from "../../auth/context/AuthContext";

export interface Notification {
  id: string;
  titre?: string;
  title?: string;
  message?: string;
  body?: string;
  isRead: boolean | string;
  createdAt: string;
  idGroup?: string;
  type?: string;
  route?: string;
  orderId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  refresh: (quiet?: boolean) => Promise<void>;
  markAsRead: (id: string, idGroup?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const isNotifRead = (n: Notification, userId?: string) => {
  if (typeof n.isRead === "boolean") return n.isRead;
  if (typeof n.isRead === "string") {
    try {
      const parsed = JSON.parse(n.isRead);
      if (Array.isArray(parsed)) return userId ? parsed.includes(userId) : parsed.length > 0;
      return !!parsed;
    } catch {
      return false;
    }
  }
  if (Array.isArray(n.isRead)) return userId ? (n.isRead as any).includes(userId) : (n.isRead as any).length > 0;
  return false;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (quiet = false) => {
    if (!userData) return;
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const endpoint =
        userData?.fastFoodId !== undefined
          ? `/notification/user?userId=${userData?.uid}&fastFoodId=${userData.fastFoodId}`
          : `/notification/user?userId=${userData?.uid}`;
      const response = await axios.get(`${Config.apiUrl}${endpoint}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (response.data && response.data.data) {
        setNotifications(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      if (!quiet) setError("Erreur lors de la récupération des notifications");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) fetchNotifications(true);
  }, [userData, fetchNotifications]);

  const markAsRead = useCallback(async (id: string, idGroup?: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await axios.put(`${Config.apiUrl}/notification/markAsRead`, {
        notificationId: id,
        notificationIdGroup: idGroup,
        userId: userData?.uid,
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  }, [userData]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !isNotifRead(n, userData?.uid)).length,
    [notifications, userData]
  );

  const value: NotificationContextType = {
    notifications,
    loading,
    error,
    unreadCount,
    refresh: fetchNotifications,
    markAsRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
  return ctx;
};
