import { ShopDrinksPage } from "@/src/features/merchant/components/drinks/ShopDrinksPage";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Boutique → « Boissons » : boissons de la boutique (page entière). */
export default function ShopDrinksScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame ownFooter>
      <ShopDrinksPage onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
