import { UserWalletModal } from "@/src/features/wallet/components/UserWalletModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Mes activites → « Portefeuille » (page entiere, sans navbar). */
export default function AccountWalletScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <UserWalletModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
