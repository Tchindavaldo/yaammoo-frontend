import { EditBoutiquePanel } from "@/src/features/merchant/components/EditBoutiquePanel";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Boutique → « Gérer ma boutique » (page entière, sans navbar). */
export default function ShopEditScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame ownFooter>
      <EditBoutiquePanel visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
