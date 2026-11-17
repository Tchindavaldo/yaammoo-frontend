import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { staffService } from "@/src/features/staff/services/staffService";
import { driverService } from "@/src/features/driver/services/driverService";

/**
 * Mode boutique / mode client, et boutique ACTIVE.
 *
 * Boutiques accessibles = la sienne (proprietaire, toutes permissions) + ses
 * postes d'employe (`GET /staff/me`, permissions du role).
 * - Mode marchand : boutique possedee active.
 * - Mode personnel : poste d'employe actif ; meme interface que le marchand,
 *   les actions hors permissions sont grisees (`can`). Le backend les refuse aussi.
 * - Mode livreur : compte avec `driverId`, rattache a une ou plusieurs
 *   boutiques (`GET /driver/stores/:driverId`). Une boutique active a la fois :
 *   header = cette boutique, onglets = ses livraisons pour elle.
 * - Mode client : aucune boutique active.
 * Demarrage : sa boutique, sinon son poste s'il n'en a qu'un, sinon mode
 * livreur s'il est livreur, sinon mode client (plusieurs choix : il choisit
 * en quittant le mode client). Personnel et livreur = « mode travail »
 * (navbar Attente / En cours / Termine).
 *
 * `fastFoodId` = boutique a utiliser par TOUT l'ecran marchand (jamais
 * `userData.fastFoodId` directement).
 */
export interface ShopOption {
  fastFoodId: string;
  name: string;
  isOwner: boolean;
  roleName?: string;
  permissions: string[];
}

interface Value {
  /** Au moins une boutique accessible (la sienne ou un poste). */
  isMerchant: boolean;
  isMerchantMode: boolean;
  /** Boutique active = poste d'employe (mode personnel). */
  isStaffMode: boolean;
  isDriver: boolean;
  isDriverMode: boolean;
  /** Personnel ou livreur : navbar Attente / En cours / Termine. */
  isWorkMode: boolean;
  shops: ShopOption[];
  activeShop: ShopOption | null;
  fastFoodId: string | null;
  can: (permission: string) => boolean;
  /** Passe en mode client (`false`) ou sur une boutique. */
  setMerchantMode: (on: boolean) => void;
  enterShop: (fastFoodId: string) => void;
  /** Boutiques du livreur ; `enterDriver(id)` = mode livreur pour cette boutique. */
  driverShops: { fastFoodId: string; name: string }[];
  driverShopId: string | null;
  enterDriver: (fastFoodId: string) => void;
  /** Nombre de modes de travail possibles (boutiques + livreur). */
  choiceCount: number;
}

const Ctx = createContext<Value>({
  isMerchant: false,
  isMerchantMode: false,
  isStaffMode: false,
  isDriver: false,
  isDriverMode: false,
  isWorkMode: false,
  choiceCount: 0,
  enterDriver: () => {},
  driverShops: [],
  driverShopId: null,
  shops: [],
  activeShop: null,
  fastFoodId: null,
  can: () => false,
  setMerchantMode: () => {},
  enterShop: () => {},
});

/** Mode actif : id de boutique, `driver:<fastFoodId>`, ou null (client). */
const DRIVER = "driver:";

const defaultActive = (shops: ShopOption[], driverIds: string[]): string | null => {
  const own = shops.find((s) => s.isOwner);
  if (own) return own.fastFoodId;
  if (shops.length + driverIds.length !== 1) return null;
  return shops[0]?.fastFoodId ?? DRIVER + driverIds[0];
};

export function MerchantModeProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const uid = userData?.uid;
  const isDriver = !!(userData as any)?.driverId;
  const ownId = userData?.isMarchand && userData?.fastFoodId ? userData.fastFoodId : null;
  const [posts, setPosts] = useState<ShopOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [driverShops, setDriverShops] = useState<{ fastFoodId: string; name: string }[]>([]);

  useEffect(() => {
    setDriverShops([]);
    if (!uid || !isDriver) return;
    let alive = true;
    driverService.getMyStores(uid).then(
      (list) => alive && setDriverShops(list.map((x) => ({ fastFoodId: x.id, name: x.nom }))),
      (e) => console.error("Error fetching driver stores:", e),
    );
    return () => {
      alive = false;
    };
  }, [uid, isDriver]);
  const driverIds = driverShops.map((d) => d.fastFoodId);

  useEffect(() => {
    setPosts([]);
    if (!uid) return;
    let alive = true;
    staffService.getMyPosts().then(
      (list) =>
        alive &&
        setPosts(
          list.map((p) => ({
            fastFoodId: p.fastFoodId,
            name: p.fastFoodName,
            isOwner: false,
            roleName: p.roleName,
            permissions: p.permissions,
          })),
        ),
      (e) => console.error("Error fetching staff posts:", e),
    );
    return () => {
      alive = false;
    };
  }, [uid]);

  const shops = useMemo<ShopOption[]>(() => {
    const own: ShopOption[] = ownId
      ? [{ fastFoodId: ownId, name: "", isOwner: true, permissions: [] }]
      : [];
    return [...own, ...posts.filter((p) => p.fastFoodId !== ownId)];
  }, [ownId, posts]);

  // Changement de compte / de postes : on repart sur la boutique par defaut.
  const shopsKey = shops.map((s) => s.fastFoodId).join(",");
  const driverKey = driverIds.join(",");
  useEffect(() => setActiveId(defaultActive(shops, driverIds)), [uid, shopsKey, driverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeShop = shops.find((s) => s.fastFoodId === activeId) ?? null;

  const can = useCallback(
    (p: string) => !!activeShop && (activeShop.isOwner || activeShop.permissions.includes(p)),
    [activeShop],
  );

  const setMerchantMode = useCallback(
    (on: boolean) => setActiveId(on ? defaultActive(shops, driverIds) : null),
    [shops, driverKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const value = useMemo<Value>(
    () => ({
      isMerchant: shops.length > 0,
      isMerchantMode: !!activeShop,
      isStaffMode: !!activeShop && !activeShop.isOwner,
      isDriver,
      isDriverMode: !!activeId?.startsWith(DRIVER),
      isWorkMode: !!activeId?.startsWith(DRIVER) || (!!activeShop && !activeShop.isOwner),
      choiceCount: shops.length + driverShops.length,
      driverShops,
      driverShopId: activeId?.startsWith(DRIVER) ? activeId.slice(DRIVER.length) : null,
      enterDriver: (id: string) => setActiveId(DRIVER + id),
      shops,
      activeShop,
      fastFoodId: activeShop?.fastFoodId ?? ownId,
      can,
      setMerchantMode,
      enterShop: setActiveId,
    }),
    [shops, activeShop, activeId, isDriver, driverShops, ownId, can, setMerchantMode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMerchantMode = () => useContext(Ctx);
