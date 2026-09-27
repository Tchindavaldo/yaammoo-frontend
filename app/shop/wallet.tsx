import { WalletManageModal } from "@/src/features/merchant/components/WalletManageModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Boutique → « Portefeuille boutique » (page entière, sans navbar). */
export default function ShopWalletScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <WalletManageModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
