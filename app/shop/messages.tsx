import { MerchantSupportModal } from "@/src/features/merchant/components/support/MerchantSupportModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Boutique → « Messages » (page entière, sans navbar). */
export default function ShopMessagesScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <MerchantSupportModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
