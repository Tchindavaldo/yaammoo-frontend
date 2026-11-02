import type { Ionicons } from "@expo/vector-icons";
import type { StaffPermission } from "../types/staff.types";
import { t } from "@/src/i18n";

export type PermissionGroup = "orders" | "shop" | "team";

/** Permission telle que l'écran l'affiche : libellés, icône et groupe. */
export interface PermissionMeta {
  key: string;
  /** Libellé complet (interrupteurs, fiche membre). */
  label: string;
  /** Libellé court (puces des cartes de rôle). */
  short: string;
  icon: keyof typeof Ionicons.glyphMap;
  group: PermissionGroup;
  hint?: string;
}

/** Clés du backend (`staffPermissions.js`) et leur rendu. */
export const PERMISSION_CATALOG: PermissionMeta[] = [
  { key: "orders.validate", label: t("Valider les commandes"), short: t("Valider"), icon: "checkmark-circle-outline", group: "orders" },
  { key: "orders.finish", label: t("Marquer une commande prête"), short: t("Marquer prête"), icon: "restaurant-outline", group: "orders" },
  { key: "orders.deliver", label: t("Livrer, assigner un livreur"), short: t("Livrer"), icon: "bicycle-outline", group: "orders" },
  { key: "orders.cancel", label: t("Annuler une commande"), short: t("Annuler"), icon: "close-circle-outline", group: "orders" },
  { key: "menus.manage", label: t("Gérer les menus"), short: t("Menus"), icon: "reader-outline", group: "shop" },
  { key: "fastfood.update", label: t("Modifier la boutique"), short: t("Boutique"), icon: "storefront-outline", group: "shop" },
  { key: "notifications.send", label: t("Envoyer des notifications"), short: "Notifications", icon: "megaphone-outline", group: "shop" },
  { key: "support.reply", label: t("Répondre aux clients"), short: t("Messagerie"), icon: "chatbubble-outline", group: "shop" },
  {
    key: "staff.manage",
    label: t("Gérer le personnel"),
    short: t("Personnel"),
    icon: "shield-checkmark-outline",
    group: "team",
    hint: t("Donne accès à cet écran"),
  },
];

export const PERMISSION_GROUPS: { key: PermissionGroup; label: string }[] = [
  { key: "orders", label: t("COMMANDES") },
  { key: "shop", label: t("BOUTIQUE") },
  { key: "team", label: t("ÉQUIPE") },
];

/**
 * Catalogue aligné sur les clés servies par le backend (source de vérité).
 * Une clé inconnue de l'app s'affiche avec le libellé du backend.
 */
export const buildCatalog = (server: StaffPermission[] | null): PermissionMeta[] => {
  if (!server?.length) return PERMISSION_CATALOG;
  return server.map(
    (p): PermissionMeta =>
      PERMISSION_CATALOG.find((c) => c.key === p.key) || {
        key: p.key,
        label: p.label,
        short: p.label,
        icon: "ellipse-outline",
        group: "shop",
      },
  );
};

/** Permissions du rôle connues du catalogue, dans l'ordre du catalogue. */
export const grantedOf = (permissions: string[], catalog: PermissionMeta[]) =>
  catalog.filter((c) => permissions.includes(c.key));

/** Toutes les permissions accordées : carte sombre « Accès complet ». */
export const isFullAccess = (permissions: string[], catalog: PermissionMeta[]) =>
  catalog.length > 0 && catalog.every((c) => permissions.includes(c.key));
