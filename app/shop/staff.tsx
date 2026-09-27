import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { StaffManageModal } from "@/src/features/staff/components/StaffManageModal";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

/**
 * Settings → Boutique → « Personnel » (page entière, sans navbar). Route du
 * Stack : retour par glissement depuis le bord gauche. `?section=drivers`
 * ouvre l'onglet Livreurs (deep-link).
 */
export default function ShopStaffScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  return (
    <ShopPageFrame>
      <StaffManageModal
        visible
        initialTab={section === "drivers" ? "drivers" : "team"}
        onClose={() => router.back()}
      />
    </ShopPageFrame>
  );
}
