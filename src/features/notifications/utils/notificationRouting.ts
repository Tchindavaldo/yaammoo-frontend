import { Notification } from "../context/NotificationContext";

export const getNotificationRoute = (notif: Partial<Notification> | null | undefined): string => {
  if (!notif) return "/(tabs)/notifications";
  if ((notif as any).route) return (notif as any).route;
  switch (notif.type) {
    case "order_new":
      return "/(tabs)/boutique";
    case "order_cancel_by_user":
    case "order_cancel_by_merchant":
      return "/(tabs)/notifications";
    case "order_status":
    case "order_delivering":
      return "/(tabs)/cart?section=finished";
    case "order_rank_top":
      return "/(tabs)/cart?section=pending";
    case "bonus":
      return "/(tabs)/cart?section=bonus";
    default:
      return "/(tabs)/notifications";
  }
};

export const getNotificationIcon = (type?: string): string => {
  switch (type) {
    case "order_new":
      return "cart-outline";
    case "order_status":
      return "checkmark-circle-outline";
    case "order_cancel_by_user":
    case "order_cancel_by_merchant":
      return "close-circle-outline";
    case "order_rank_top":
      return "trophy-outline";
    case "order_delivering":
      return "bicycle-outline";
    case "bonus":
      return "gift-outline";
    default:
      return "notifications-outline";
  }
};
