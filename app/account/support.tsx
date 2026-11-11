import { SupportChatSheet } from "@/src/features/support/components/SupportChatSheet";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { useRouter } from "expo-router";
import React from "react";

/** Settings → « Contactez-nous » (page entiere, sans navbar). */
export default function AccountSupportScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <SupportChatSheet visible onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
