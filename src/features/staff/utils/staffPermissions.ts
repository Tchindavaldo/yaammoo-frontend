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
  { key: "orders.validate", get label() { return t("Valider les commandes"); }, get short() { return t("Valider"); }, icon: "checkmark-circle-outline", group: "orders" },
  { key: "orders.finish", get label() { return t("Marquer une commande prête"); }, get short() { return t("Marquer prête"); }, icon: "restaurant-outline", group: "orders" },
  { key: "orders.deliver", get label() { return t("Livrer, assigner un livreur"); }, get short() { return t("Livrer"); }, icon: "bicycle-outline", group: "orders" },
  { key: "orders.cancel", get label() { return t("Annuler une commande"); }, get short() { return t("Annuler"); }, icon: "close-circle-outline", group: "orders" },
  { key: "menus.manage", get label() { return t("Gérer les menus"); }, get short() { return t("Menus"); }, icon: "reader-outline", group: "shop" },
  { key: "fastfood.update", get label() { return t("Modifier la boutique"); }, get short() { return t("Boutique"); }, icon: "storefront-outline", group: "shop" },
  { key: "notifications.send", get label() { return t("Envoyer des notifications"); }, short: "Notifications", icon: "megaphone-outline", group: "shop" },
  { key: "support.reply", get label() { return t("Répondre aux clients"); }, get short() { return t("Messagerie"); }, icon: "chatbubble-outline", group: "shop" },
  {
    key: "staff.manage",
    get label() { return t("Gérer le personnel"); },
    get short() { return t("Personnel"); },
    icon: "shield-checkmark-outline",
    group: "team",
    get hint() { return t("Donne accès à cet écran"); },
  },
];

export const PERMISSION_GROUPS: { key: PermissionGroup; label: string }[] = [
  { key: "orders", get label() { return t("COMMANDES"); } },
  { key: "shop", get label() { return t("BOUTIQUE"); } },
  { key: "team", get label() { return t("ÉQUIPE"); } },
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
