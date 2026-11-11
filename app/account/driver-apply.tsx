import { DriverApplyModal } from "@/src/features/driver/components/DriverApplyModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Livraison → « Devenir livreur » (page entiere, sans navbar). */
export default function AccountDriverApplyScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <DriverApplyModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
