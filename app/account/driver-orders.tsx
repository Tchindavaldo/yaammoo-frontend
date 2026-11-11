import { DriverOrdersModal } from "@/src/features/driver/components/DriverOrdersModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Livraison → « Mes livraisons » (page entiere, sans navbar). */
export default function AccountDriverOrdersScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <DriverOrdersModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
