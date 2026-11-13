import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { StaffDriversPage } from "@/src/features/staff/components/StaffDriversPage";
import { useRouter } from "expo-router";
import React from "react";

/** Gestion → « Livreurs » (page entière, sans navbar) : demandes, livreurs, ajout. */
export default function ShopDriversScreen() {
  const router = useRouter();
  return (
    <ShopPageFrame>
      <StaffDriversPage onClose={() => router.back()} />
    </ShopPageFrame>
  );
}
