import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import axios from "axios";
import * as Notifications from "expo-notifications";
import { Config } from "../../../api/config";
import { useAuth } from "../../auth/context/AuthContext";
import { storage } from "../../../utils/storage";
import { useResetOnUserChange } from "@/src/hooks/useResetOnUserChange";

export interface Notification {
  id: string;
  titre?: string;
  title?: string;
  message?: string;
  body?: string;
  isRead: boolean | string | string[];
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
  isRead: (notif: Notification) => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const CACHE_KEY = "notifications_cache";
const QUEUE_KEY = "notif_read_queue";

type ReadOp = { id: string; idGroup?: string; userId: string };

export const isNotifRead = (n: Notification, userId?: string) => {
  const v: any = n.isRead;
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return userId ? v.includes(userId) : v.length > 0;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return userId ? parsed.includes(userId) : parsed.length > 0;
      return !!parsed;
    } catch {
      return false;
    }
  }
  return false;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingReadIdsRef = useRef<Set<string>>(new Set());

  // Une donnée FRAÎCHE (serveur ou socket) est déjà arrivée : l'hydratation
  // storage, asynchrone, ne doit plus écraser le state — sinon la liste
  // s'affiche puis disparaît (cache vide/périmé posé après la réponse serveur).
  const hasFreshDataRef = useRef(false);

  // Hydrate depuis storage au montage (affichage instantané)
  useEffect(() => {
    (async () => {
      const q = (await storage.get(QUEUE_KEY)) as ReadOp[] | null;
      if (Array.isArray(q)) pendingReadIdsRef.current = new Set(q.map(o => o.id));
      const cached = await storage.get(CACHE_KEY);
      if (!hasFreshDataRef.current && Array.isArray(cached) && cached.length > 0) {
        setNotifications(cached);
      }
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
    // Sans `uid`, la requête partirait en `userId=undefined` et renverrait une
    // liste vide qui écraserait le cache : on attend que l'auth soit complète.
    if (!userData?.uid) return;
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
      // Une réponse mal formée (pas de tableau) ne doit JAMAIS vider la liste :
      // on garde ce qui est affiché plutôt que de faire disparaître les notifs.
      if (Array.isArray(response.data?.data)) {
        const server: Notification[] = response.data.data;
        hasFreshDataRef.current = true;
        const uid = userData.uid;
        // Filet de sécurité : ré-appliquer les reads optimistes (user déjà présent dans isRead)
        const pendingIds = pendingReadIdsRef.current;
        const merged = pendingIds.size === 0
          ? server
          : server.map(n => {
            if (!pendingIds.has(n.id)) return n;
            const current: any = n.isRead;
            let arr: string[] = [];
            if (Array.isArray(current)) arr = current.slice();
            else if (typeof current === "string") {
              try { const p = JSON.parse(current); if (Array.isArray(p)) arr = p.slice(); } catch { }
            }
            if (!arr.includes(uid)) arr.push(uid);
            return { ...n, isRead: arr };
          });
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

  // Changement de compte : le state ET le cache storage sont purges. Le cache
  // `notifications_cache` n'est pas indexe par compte : sans purge, le compte
  // suivant s'hydrate avec les notifications du precedent au montage.
  useResetOnUserChange(userData?.uid, () => {
    hasFreshDataRef.current = false;
    pendingReadIdsRef.current = new Set();
    setNotifications([]);
    setError(null);
    storage.remove(CACHE_KEY).catch(() => {});
  });

  // Premier chargement après login (silencieux). Plus de refresh auto sur socket/push.
  const didInitialFetchRef = useRef(false);
  useEffect(() => {
    // Conditionné à `uid` : `userData` peut arriver incomplet, et consommer le
    // flag trop tôt empêcherait définitivement le premier chargement.
    if (userData?.uid && !didInitialFetchRef.current) {
      didInitialFetchRef.current = true;
      fetchNotifications(true);
    }
    // Déconnexion : on réarme pour que la prochaine connexion refetch.
    if (!userData?.uid) didInitialFetchRef.current = false;
  }, [userData, fetchNotifications]);

  const markAsRead = useCallback(async (id: string, idGroup?: string) => {
    if (!userData) return;
    const uid = userData.uid;

    // Track l'optimistic read — le merge du prochain fetch s'en sert en filet de sécurité.
    pendingReadIdsRef.current.add(id);

    // 1. Optimistic state update — format cohérent avec le serveur (array de userIds)
    setNotifications(prev => {
      const next = prev.map(n => {
        if (n.id !== id) return n;
        const current: any = n.isRead;
        let arr: string[] = [];
        if (Array.isArray(current)) arr = current.slice();
        else if (typeof current === "string") {
          try { const p = JSON.parse(current); if (Array.isArray(p)) arr = p.slice(); } catch { }
        }
        if (!arr.includes(uid)) arr.push(uid);
        return { ...n, isRead: arr };
      });
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
    hasFreshDataRef.current = true;
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

  const isRead = useCallback(
    (n: Notification) => isNotifRead(n, userData?.uid),
    [userData]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !isRead(n)).length,
    [notifications, isRead]
  );

  // Badge de l'icône d'application, aligné sur le compteur de non-lus. Piloté
  // ici plutôt qu'au reçu d'un push : le compteur bouge aussi à la lecture, au
  // refresh et au catch-up de retour au premier plan — un badge posé seulement
  // à la réception resterait figé après coup.
  // Android sans launcher compatible ignore l'appel : échec silencieux voulu,
  // ce n'est pas une erreur à remonter au user.
  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

  const value: NotificationContextType = {
    notifications,
    loading,
    error,
    unreadCount,
    refresh: fetchNotifications,
    markAsRead,
    addFromSocket,
    isRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
  return ctx;
};
