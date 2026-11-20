// Lien profond `yaammoo://shop/<id>` (QR code d'une boutique, scanne depuis
// l'appareil photo) : ouvre la page de recherche sur les plats de cette boutique.
import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

export default function ShopDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/search", params: { shopId: String(id) } }} />;
}
