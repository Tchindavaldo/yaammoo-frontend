import { BroadcastManageModal } from "@/src/features/merchant/components/broadcast/BroadcastManageModal";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → Boutique → « Notifications » (page entière, sans navbar). */
export default function ShopNotificationsScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <BroadcastManageModal visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
