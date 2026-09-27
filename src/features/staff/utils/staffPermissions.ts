import type { Ionicons } from "@expo/vector-icons";
import type { StaffPermission } from "../types/staff.types";

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
  { key: "orders.validate", label: "Valider les commandes", short: "Valider", icon: "checkmark-circle-outline", group: "orders" },
  { key: "orders.finish", label: "Marquer une commande prête", short: "Marquer prête", icon: "restaurant-outline", group: "orders" },
  { key: "orders.deliver", label: "Livrer, assigner un livreur", short: "Livrer", icon: "bicycle-outline", group: "orders" },
  { key: "orders.cancel", label: "Annuler une commande", short: "Annuler", icon: "close-circle-outline", group: "orders" },
  { key: "menus.manage", label: "Gérer les menus", short: "Menus", icon: "reader-outline", group: "shop" },
  { key: "fastfood.update", label: "Modifier la boutique", short: "Boutique", icon: "storefront-outline", group: "shop" },
  { key: "notifications.send", label: "Envoyer des notifications", short: "Notifications", icon: "megaphone-outline", group: "shop" },
  { key: "support.reply", label: "Répondre aux clients", short: "Messagerie", icon: "chatbubble-outline", group: "shop" },
  {
    key: "staff.manage",
    label: "Gérer le personnel",
    short: "Personnel",
    icon: "shield-checkmark-outline",
    group: "team",
    hint: "Donne accès à cet écran",
  },
];

export const PERMISSION_GROUPS: { key: PermissionGroup; label: string }[] = [
  { key: "orders", label: "COMMANDES" },
  { key: "shop", label: "BOUTIQUE" },
  { key: "team", label: "ÉQUIPE" },
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
