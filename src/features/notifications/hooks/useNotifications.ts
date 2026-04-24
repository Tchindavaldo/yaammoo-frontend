import { useNotificationContext, Notification } from "../context/NotificationContext";

export type { Notification };

export const useNotifications = () => {
  const ctx = useNotificationContext();
  return {
    notifications: ctx.notifications,
    loading: ctx.loading,
    error: ctx.error,
    unreadCount: ctx.unreadCount,
    refresh: ctx.refresh,
    markAsRead: ctx.markAsRead,
    addFromSocket: ctx.addFromSocket,
    isRead: ctx.isRead,
  };
};
