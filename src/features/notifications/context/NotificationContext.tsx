import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import axios from "axios";
import { Config } from "../../../api/config";
import { useAuth } from "../../auth/context/AuthContext";
import { storage } from "../../../utils/storage";

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
  addFromSocket: (notif: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const CACHE_KEY = "notifications_cache";
const QUEUE_KEY = "notif_read_queue";

type ReadOp = { id: string; idGroup?: string; userId: string };

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
  const pendingReadIdsRef = useRef<Set<string>>(new Set());

  // Hydrate depuis storage au montage (affichage instantané)
  useEffect(() => {
    (async () => {
      const cached = await storage.get(CACHE_KEY);
      if (Array.isArray(cached)) setNotifications(cached);
      const q = (await storage.get(QUEUE_KEY)) as ReadOp[] | null;
      if (Array.isArray(q)) pendingReadIdsRef.current = new Set(q.map(o => o.id));
    })();
  }, []);

  const persistCache = useCallback(async (list: Notification[]) => {
    try { await storage.set(CACHE_KEY, list); } catch { }
  }, []);

  const getQueue = async (): Promise<ReadOp[]> => {
    const q = await storage.get(QUEUE_KEY);
    return Array.isArray(q) ? q : [];
  };

  const setQueue = async (q: ReadOp[]) => {
    await storage.set(QUEUE_KEY, q);
    pendingReadIdsRef.current = new Set(q.map(o => o.id));
  };

  const flushReadQueue = useCallback(async () => {
    const q = await getQueue();
    if (q.length === 0) return;
    const remaining: ReadOp[] = [];
    for (const op of q) {
      try {
        await axios.put(`${Config.apiUrl}/notification/markAsRead`, {
          notificationId: op.id,
          notificationIdGroup: op.idGroup,
          userId: op.userId,
        }, { headers: { "ngrok-skip-browser-warning": "true" } });
      } catch {
        remaining.push(op);
      }
    }
    await setQueue(remaining);
  }, []);

  const fetchNotifications = useCallback(async (quiet = false) => {
    if (!userData) return;
    try {
      if (!quiet) setLoading(true);
      setError(null);

      // Flush des markAsRead en attente avant de fetch (sinon le serveur renverrait isRead=false)
      await flushReadQueue();

      const endpoint =
        userData?.fastFoodId !== undefined
          ? `/notification/user?userId=${userData?.uid}&fastFoodId=${userData.fastFoodId}`
          : `/notification/user?userId=${userData?.uid}`;
      const response = await axios.get(`${Config.apiUrl}${endpoint}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (response.data && response.data.data) {
        const server: Notification[] = response.data.data;
        // Filet de sécurité : ré-appliquer les reads optimistes encore en queue
        const pendingIds = pendingReadIdsRef.current;
        const merged = pendingIds.size === 0
          ? server
          : server.map(n => pendingIds.has(n.id) ? { ...n, isRead: true } : n);
        setNotifications(merged);
        persistCache(merged);
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      if (!quiet) setError("Erreur lors de la récupération des notifications");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [userData, flushReadQueue, persistCache]);

  // Premier chargement après login (silencieux). Plus de refresh auto sur socket/push.
  const didInitialFetchRef = useRef(false);
  useEffect(() => {
    if (userData && !didInitialFetchRef.current) {
      didInitialFetchRef.current = true;
      fetchNotifications(true);
    }
  }, [userData, fetchNotifications]);

  const markAsRead = useCallback(async (id: string, idGroup?: string) => {
    if (!userData) return;

    // 1. Optimistic state update
    setNotifications(prev => {
      const next = prev.map(n => (n.id === id ? { ...n, isRead: true } : n));
      persistCache(next);
      return next;
    });

    // 2. Fire & forget — en cas d'échec, push dans la queue pour retry ultérieur
    try {
      await axios.put(`${Config.apiUrl}/notification/markAsRead`, {
        notificationId: id,
        notificationIdGroup: idGroup,
        userId: userData.uid,
      }, { headers: { "ngrok-skip-browser-warning": "true" } });
    } catch (err) {
      console.warn("markAsRead failed, queued for retry:", (err as Error).message);
      const q = await getQueue();
      if (!q.find(op => op.id === id)) {
        await setQueue([...q, { id, idGroup, userId: userData.uid }]);
      }
    }
  }, [userData, persistCache]);

  const addFromSocket = useCallback((notif: Notification) => {
    if (!notif?.id) return;
    setNotifications(prev => {
      const existing = prev.find(n => n.id === notif.id);
      if (existing) {
        // Doublons : conserver l'état optimiste (isRead) si on l'a marqué localement
        if (pendingReadIdsRef.current.has(notif.id) || existing.isRead !== notif.isRead) {
          return prev;
        }
        return prev;
      }
      const next = [notif, ...prev];
      persistCache(next);
      return next;
    });
  }, [persistCache]);

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
    addFromSocket,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
  return ctx;
};
