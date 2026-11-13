import { useAuth } from "@/src/features/auth/context/AuthContext";
import { ShopCreateBoutiquePanel } from "@/src/features/merchant/components/ShopCreateBoutiquePanel";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";

/** Profil → « Créer ma boutique » (page entière, sans navbar, comme l'édition). */
export default function ShopCreateScreen() {
  const router = useRouter();
  const { userData } = useAuth();

  // Boutique créée (fastFoodId posé) : retour au home, qui passe en mode
  // marchand (MerchantModeContext repart en marchand quand fastFoodId change).
  useEffect(() => {
    if (userData?.fastFoodId) router.navigate("/(tabs)");
  }, [userData?.fastFoodId, router]);

  return (
    <ShopPageFrame ownFooter>
      <ShopCreateBoutiquePanel onCancel={() => router.back()} />
    </ShopPageFrame>
  );
}
