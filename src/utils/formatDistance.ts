/**
 * Distance lisible : « 850 m » sous 1 km, « 1,2 km » ensuite (« 12 km » au-delà
 * de 10 km). Pure, partagée par le home (distance des boutiques) et le suivi
 * de livraison.
 */
export const formatDistanceKm = (km: number | null | undefined): string | null => {
  if (typeof km !== "number" || !Number.isFinite(km) || km < 0) return null;
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
};
