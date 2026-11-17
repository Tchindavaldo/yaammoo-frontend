import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { staffService } from "@/src/features/staff/services/staffService";

/**
 * Mode boutique / mode client, et boutique ACTIVE.
 *
 * Boutiques accessibles = la sienne (proprietaire, toutes permissions) + ses
 * postes d'employe (`GET /staff/me`, permissions du role).
 * - Mode marchand : boutique possedee active.
 * - Mode personnel : poste d'employe actif ; meme interface que le marchand,
 *   les actions hors permissions sont grisees (`can`). Le backend les refuse aussi.
 * - Mode livreur : compte avec `driverId`, onglets = ses livraisons.
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
  enterDriver: () => void;
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
  shops: [],
  activeShop: null,
  fastFoodId: null,
  can: () => false,
  setMerchantMode: () => {},
  enterShop: () => {},
});

/** Mode actif : id de boutique, DRIVER, ou null (client). */
const DRIVER = "__driver__";

const defaultActive = (shops: ShopOption[], isDriver: boolean): string | null => {
  const own = shops.find((s) => s.isOwner);
  if (own) return own.fastFoodId;
  const choices = shops.length + (isDriver ? 1 : 0);
  if (choices !== 1) return null;
  return shops[0]?.fastFoodId ?? DRIVER;
};

export function MerchantModeProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const uid = userData?.uid;
  const isDriver = !!(userData as any)?.driverId;
  const ownId = userData?.isMarchand && userData?.fastFoodId ? userData.fastFoodId : null;
  const [posts, setPosts] = useState<ShopOption[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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
  useEffect(() => setActiveId(defaultActive(shops, isDriver)), [uid, shopsKey, isDriver]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeShop = shops.find((s) => s.fastFoodId === activeId) ?? null;

  const can = useCallback(
    (p: string) => !!activeShop && (activeShop.isOwner || activeShop.permissions.includes(p)),
    [activeShop],
  );

  const setMerchantMode = useCallback(
    (on: boolean) => setActiveId(on ? defaultActive(shops, isDriver) : null),
    [shops, isDriver],
  );

  const value = useMemo<Value>(
    () => ({
      isMerchant: shops.length > 0,
      isMerchantMode: !!activeShop,
      isStaffMode: !!activeShop && !activeShop.isOwner,
      isDriver,
      isDriverMode: activeId === DRIVER,
      isWorkMode: activeId === DRIVER || (!!activeShop && !activeShop.isOwner),
      choiceCount: shops.length + (isDriver ? 1 : 0),
      enterDriver: () => setActiveId(DRIVER),
      shops,
      activeShop,
      fastFoodId: activeShop?.fastFoodId ?? ownId,
      can,
      setMerchantMode,
      enterShop: setActiveId,
    }),
    [shops, activeShop, activeId, isDriver, ownId, can, setMerchantMode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMerchantMode = () => useContext(Ctx);
