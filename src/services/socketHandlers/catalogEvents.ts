import type { Socket } from "socket.io-client";
import { withAck } from "../socketAck";
import { logEvent } from "./logEvent";
import { requestFastfoodsRefresh, requestFastfoodsRemove } from "../fastfoodRefreshBus";

type Fn = (...args: any[]) => unknown;

interface CatalogDeps {
  upsertMerchantMenu: Fn;
  removeMerchantMenu: Fn;
  upsertGlobalMenu: Fn;
  removeGlobalMenu: Fn;
  upsertGlobalFastFood: Fn;
}

const EVENTS = [
  "newMenu",
  "newFastFoodMenu",
  "fastFoodMenuUpdated",
  "fastFoodMenuDeleted",
  "newGlobalMenu",
  "globalMenuUpdated",
  "globalMenuDeleted",
  "newFastfood",
  "fastfoodUpdated",
  "fastfoodsChanged",
  "fastfoodsHidden",
];

/**
 * Events socket du CATALOGUE : menus marchand, menus globaux, boutiques.
 * Sorti de `useSocketEvents.ts` (plafond de 500 lignes, R4).
 * @returns la fonction de désabonnement.
 */
export const registerCatalogEvents = (
  socket: Socket,
  {
    upsertMerchantMenu,
    removeMerchantMenu,
    upsertGlobalMenu,
    removeGlobalMenu,
    upsertGlobalFastFood,
  }: CatalogDeps,
) => {
  // ── Menus marchand ────────────────────────────────────────────────
  // newMenu { data: menu } / newFastFoodMenu { menu } → upsert
  socket.on("newMenu", withAck((data: any) => {
    logEvent("newMenu:", data);
    if (data?.data) upsertMerchantMenu(data.data);
  }));
  socket.on("newFastFoodMenu", withAck((data: any) => {
    logEvent("newFastFoodMenu:", data);
    if (data?.menu) upsertMerchantMenu(data.menu);
  }));
  // fastFoodMenuUpdated { menuId, menu } → upsert
  socket.on("fastFoodMenuUpdated", withAck((data: any) => {
    logEvent("fastFoodMenuUpdated:", data);
    if (data?.menu) upsertMerchantMenu(data.menu);
  }));
  // fastFoodMenuDeleted { fastFood, menuId } → remove
  socket.on("fastFoodMenuDeleted", withAck((data: any) => {
    logEvent("fastFoodMenuDeleted:", data);
    if (data?.menuId) removeMerchantMenu(data.menuId);
  }));

  // ── Menus globaux (liste restaurants) ─────────────────────────────
  // newGlobalMenu { menu } / globalMenuUpdated { menuId, menu } → upsert
  socket.on("newGlobalMenu", withAck((data: any) => {
    logEvent("newGlobalMenu:", data);
    if (data?.menu) upsertGlobalMenu(data.menu);
  }));
  socket.on("globalMenuUpdated", withAck((data: any) => {
    logEvent("globalMenuUpdated:", data);
    if (data?.menu) upsertGlobalMenu(data.menu);
  }));
  // globalMenuDeleted { fastFood, menuId } → remove
  socket.on("globalMenuDeleted", withAck((data: any) => {
    logEvent("globalMenuDeleted:", data);
    const ffId = data?.fastFood?.id ?? data?.fastFood;
    if (ffId && data?.menuId) removeGlobalMenu(ffId, data.menuId);
  }));

  // ── Fastfood ──────────────────────────────────────────────────────
  // newFastfood { fastFood } → upsert dans la liste
  socket.on("newFastfood", withAck((data: any) => {
    logEvent("newFastfood:", data);
    if (data?.fastFood) upsertGlobalFastFood(data.fastFood);
  }));

  // fastfoodUpdated { fastFood } : VUE HOME complete de la boutique modifiee
  // (fiche, zones / prix / creneaux / express, regime, menus) -> appliquee
  // telle quelle, sans requete. `deliveryOffer` absent = bonus du user garde.
  socket.on("fastfoodUpdated", withAck((data: any) => {
    logEvent("fastfoodUpdated:", data);
    const ff = data?.fastFood ?? data;
    if (ff?.id) upsertGlobalFastFood(ff);
  }));

  // fastfoodsChanged { ids: null } : reglage GLOBAL (frais, marges, interrupteur
  // plateforme) -> tout le catalogue change ; rafraichissement silencieux en
  // arriere-plan, le meme qu'au retour au premier plan. Une liste d'ids (ancien
  // backend) est rechargee de facon ciblee.
  socket.on("fastfoodsChanged", withAck((data: any) => {
    logEvent("fastfoodsChanged:", data);
    requestFastfoodsRefresh(Array.isArray(data?.ids) ? data.ids : null);
  }));

  // fastfoodsHidden { ids } : boutiques modifiees devenues invisibles au home
  // (indisponibles, masquees, sans plat) -> retirees, sans requete.
  socket.on("fastfoodsHidden", withAck((data: any) => {
    logEvent("fastfoodsHidden:", data);
    if (Array.isArray(data?.ids)) requestFastfoodsRemove(data.ids);
  }));

  return () => EVENTS.forEach((e) => socket.off(e));
};
