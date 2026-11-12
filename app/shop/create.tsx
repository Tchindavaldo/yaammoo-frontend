import { useAuth } from "@/src/features/auth/context/AuthContext";
import { ShopCreateBoutiquePanel } from "@/src/features/merchant/components/ShopCreateBoutiquePanel";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";

/** Profil → « Créer ma boutique » (page entière, sans navbar, comme l'édition). */
export default function ShopCreateScreen() {
  const router = useRouter();
  const { userData } = useAuth();

  // Boutique créée (fastFoodId posé) : on bascule sur ses commandes.
  useEffect(() => {
    if (userData?.fastFoodId) router.replace("/shop/orders");
  }, [userData?.fastFoodId, router]);

  return (
    <ShopPageFrame ownFooter>
      <ShopCreateBoutiquePanel onCancel={() => router.back()} />
    </ShopPageFrame>
  );
}
