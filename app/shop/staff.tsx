import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { StaffManageModal } from "@/src/features/staff/components/StaffManageModal";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

/**
 * Settings → Boutique → « Personnel » (page entière, sans navbar). Route du
 * Stack : retour par glissement depuis le bord gauche. `?section=drivers`
 * redirige vers la page Livreurs.
 */
export default function ShopStaffScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  // Ancien lien « ?section=drivers » : les livreurs ont leur propre page.
  if (section === "drivers") return <Redirect href="/shop/drivers" />;
  return (
    <ShopPageFrame>
      <StaffManageModal
        visible
        initialTab="team"
        onClose={() => router.back()}
      />
    </ShopPageFrame>
  );
}
