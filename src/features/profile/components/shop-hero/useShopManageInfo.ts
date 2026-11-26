// Chiffres des cases « Gestion » du home marchand (ShopManageGrid) : vraies donnees,
// `null` tant qu'aucune reponse n'est arrivee (case en squelette, y compris backend eteint :
// relance au retour du reseau et au pull-to-refresh).
import axios from "axios";
import { useEffect, useState } from "react";
import { Config } from "@/src/api/config";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { broadcastService } from "@/src/features/merchant/services/broadcastService";
import { merchantSupportService } from "@/src/features/merchant/services/merchantSupportService";
import { computeQuota } from "@/src/features/merchant/utils/broadcastQuota";
import { staffService } from "@/src/features/staff/services/staffService";
import { driverService } from "@/src/features/driver/services/driverService";
import { pendingOf } from "@/src/features/staff/hooks/useStaffDrivers";
import { useRefetchOnReconnect } from "@/src/hooks/useRefetchOnReconnect";

/** `null` = pas encore de reponse, nombre = valeur. */
export type Count = number | null;
export interface ShopManageInfo {
  menus: Count;
  drinks: Count;
  members: Count;
  broadcastsLeft: Count;
  unread: Count;
  driverRequests: Count;
}

const LOADING: Omit<ShopManageInfo, "menus"> = { drinks: null, members: null, broadcastsLeft: null, unread: null, driverRequests: null };

const RETRY_MS = 4000;

export function useShopManageInfo(refreshTick = 0): ShopManageInfo {
  const { fastFoodId } = useMerchantMode();
  const { menus, loaded, ensureLoaded } = useMerchant();
  const [info, setInfo] = useState(LOADING);
  const [reconnectTick, setReconnectTick] = useState(0);
  useRefetchOnReconnect(() => setReconnectTick((n) => n + 1));
  // Backend en demarrage : un echec relance tout seul apres RETRY_MS.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded, retryTick]);

  useEffect(() => {
    if (!fastFoodId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const retry = () => {
      if (alive && !timer) timer = setTimeout(() => setRetryTick((n) => n + 1), RETRY_MS);
    };
    // Chaque case se remplit des que SA requete repond ; un echec garde la valeur precedente.
    const put = <K extends keyof typeof LOADING>(key: K, p: Promise<number>) =>
      p.then(
        (v) => alive && setInfo((s) => ({ ...s, [key]: v })),
        (e) => {
          console.error(`[useShopManageInfo] ${key}:`, e?.message || e);
          retry();
        },
      );
    put("drinks", axios.get(`${Config.apiUrl}/fastfood/${fastFoodId}`).then((r) => (r.data?.data?.drinks || []).length));
    put("members", staffService.getMembers(fastFoodId).then((m) => m.length));
    put("broadcastsLeft", broadcastService.getState(fastFoodId).then((s) => computeQuota(s.plan, s.items, new Date()).dayLeft));
    put("unread", merchantSupportService.getThreads(fastFoodId).then((th) => th.reduce((n, x) => n + (x.unreadCount || 0), 0)));
    put("driverRequests", driverService.getApplications(fastFoodId).then((a) => pendingOf(a).length));
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [fastFoodId, refreshTick, reconnectTick, retryTick]);

  return { ...info, menus: loaded ? menus.length : null };
}
