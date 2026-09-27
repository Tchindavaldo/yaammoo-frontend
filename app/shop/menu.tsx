import { MenuManageModal } from "@/src/features/merchant/components/MenuManageModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Boutique → « Gestion menu » (page entière, sans navbar). */
export default function ShopMenuScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <MenuManageModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
