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
 * - Mode client : aucune boutique active.
 * Demarrage : sa boutique, sinon son poste s'il n'en a qu'un, sinon mode client
 * (plusieurs postes : l'employe choisit en passant en mode personnel).
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
  shops: ShopOption[];
  activeShop: ShopOption | null;
  fastFoodId: string | null;
  can: (permission: string) => boolean;
  /** Passe en mode client (`false`) ou sur une boutique. */
  setMerchantMode: (on: boolean) => void;
  enterShop: (fastFoodId: string) => void;
}

const Ctx = createContext<Value>({
  isMerchant: false,
  isMerchantMode: false,
  isStaffMode: false,
  shops: [],
  activeShop: null,
  fastFoodId: null,
  can: () => false,
  setMerchantMode: () => {},
  enterShop: () => {},
});

const defaultShopId = (shops: ShopOption[]) =>
  shops.find((s) => s.isOwner)?.fastFoodId ?? (shops.length === 1 ? shops[0].fastFoodId : null);

export function MerchantModeProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const uid = userData?.uid;
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
  useEffect(() => setActiveId(defaultShopId(shops)), [uid, shopsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeShop = shops.find((s) => s.fastFoodId === activeId) ?? null;

  const can = useCallback(
    (p: string) => !!activeShop && (activeShop.isOwner || activeShop.permissions.includes(p)),
    [activeShop],
  );

  const setMerchantMode = useCallback(
    (on: boolean) => setActiveId(on ? defaultShopId(shops) : null),
    [shops],
  );

  const value = useMemo<Value>(
    () => ({
      isMerchant: shops.length > 0,
      isMerchantMode: !!activeShop,
      isStaffMode: !!activeShop && !activeShop.isOwner,
      shops,
      activeShop,
      fastFoodId: activeShop?.fastFoodId ?? ownId,
      can,
      setMerchantMode,
      enterShop: setActiveId,
    }),
    [shops, activeShop, ownId, can, setMerchantMode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMerchantMode = () => useContext(Ctx);
