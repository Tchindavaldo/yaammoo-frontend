import type { Notification } from "@/src/features/notifications/hooks/useNotifications";

export interface NotificationSection {
  title: string;
  data: Notification[];
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Libellé du jour : « Aujourd'hui », « Hier », jour de semaine sur 7 jours, sinon date complète. */
const dayLabel = (d: Date, now: Date): string => {
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  const opts: Intl.DateTimeFormatOptions =
    days < 7
      ? { weekday: "long" }
      : d.getFullYear() === now.getFullYear()
        ? { weekday: "long", day: "numeric", month: "long" }
        : { day: "numeric", month: "long", year: "numeric" };
  const s = d.toLocaleDateString("fr-FR", opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Regroupe les notifications par jour (plus récent d'abord), en conservant l'ordre interne. */
export const groupNotificationsByDate = (
  notifications: Notification[],
): NotificationSection[] => {
  const now = new Date();
  const sorted = [...notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const sections: NotificationSection[] = [];
  const byKey = new Map<number, NotificationSection>();
  for (const n of sorted) {
    const d = new Date(n.createdAt);
    const valid = !isNaN(d.getTime());
    const key = valid ? startOfDay(d) : -1;
    let section = byKey.get(key);
    if (!section) {
      section = { title: valid ? dayLabel(d, now) : "Plus ancien", data: [] };
      byKey.set(key, section);
      sections.push(section);
    }
    section.data.push(n);
  }
  return sections;
};
