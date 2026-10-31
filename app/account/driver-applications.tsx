import { DriverMyApplicationsModal } from "@/src/features/driver/components/DriverMyApplicationsModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Livraison → « Mes demandes » (page entiere, sans navbar). */
export default function AccountDriverApplicationsScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <DriverMyApplicationsModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
