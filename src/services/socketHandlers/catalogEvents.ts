import type { Socket } from "socket.io-client";
import { withAck } from "../socketAck";
import { logEvent } from "./logEvent";
import { requestFastfoodsRefresh } from "../fastfoodRefreshBus";

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

  // fastfoodUpdated { fastFood } → mêmes données que newFastfood. upsert
  // (l'édition d'une boutique met à jour son image/horaires sur la home).
  socket.on("fastfoodUpdated", withAck((data: any) => {
    logEvent("fastfoodUpdated:", data);
    const ff = data?.fastFood ?? data;
    if (ff?.id) upsertGlobalFastFood(ff);
  }));

  // fastfoodsChanged { ids: string[] | null } → recharge ces boutiques (null =
  // toutes) avec le jeton du user : zones, prix, regime, offre de livraison.
  socket.on("fastfoodsChanged", withAck((data: any) => {
    logEvent("fastfoodsChanged:", data);
    requestFastfoodsRefresh(Array.isArray(data?.ids) ? data.ids : null);
  }));

  return () => EVENTS.forEach((e) => socket.off(e));
};
