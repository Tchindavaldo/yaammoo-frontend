// Filtres du panier (`cart.tsx`), extrait pour R4 : 3 axes independants
// (zone / periode / heure), chacun choisi dans son propre bottom sheet via les
// chips de tete de liste. Remis a zero a chaque retour sur l'onglet.
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { CartFilterKind } from "../components/CartFilterChipsRow";
import { t } from "@/src/i18n";

/** Libellé de période d'une commande : "Express" / "Créneau" / "Sur place". */
const periodeOf = (o: any) =>
  o?.delivery?.status !== true
    ? t("Sur place")
    : o?.delivery?.type === "express"
      ? "Express"
      : t("Créneau");

/** Zone de livraison, "Retrait en boutique" à défaut. */
const zoneOf = (o: any) =>
  o?.delivery?.status === true
    ? o?.delivery?.zone || o?.delivery?.location || t("Zone inconnue")
    : t("Retrait en boutique");

/** Créneau horaire, `null` hors livraison programmée. */
const heureOf = (o: any): string | null =>
  o?.delivery?.type === "time" ? o?.delivery?.time || o?.delivery?.hour || null : null;

/** Compte les valeurs distinctes d'un axe sur un lot de commandes. */
const countBy = (orders: any[], pick: (o: any) => string | null) => {
  const map = new Map<string, number>();
  orders.forEach((o) => {
    const k = pick(o);
    if (k) map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([key, count]) => ({ key, label: key, count }));
};

export const useCartFilters = (visibleCartOrders: any[], onFocusReset: () => void) => {
  const [openFilterKind, setOpenFilterKind] = useState<CartFilterKind | null>(null);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [periodeFilter, setPeriodeFilter] = useState<string | null>(null);
  const [heureFilter, setHeureFilter] = useState<string | null>(null);

  // Retour sur l'onglet : on repart d'une vue complète du panier.
  useFocusEffect(
    useCallback(() => {
      setZoneFilter(null);
      setPeriodeFilter(null);
      setHeureFilter(null);
      onFocusReset();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Les 3 axes se composent en ET ; un axe `null` n'impose rien.
  const filteredCartOrders = useMemo(
    () =>
      visibleCartOrders.filter((o: any) => {
        if (zoneFilter && zoneOf(o) !== zoneFilter) return false;
        if (periodeFilter && periodeOf(o) !== periodeFilter) return false;
        if (heureFilter && heureOf(o) !== heureFilter) return false;
        return true;
      }),
    [visibleCartOrders, zoneFilter, periodeFilter, heureFilter],
  );

  // Options comptées AVANT filtrage : choisir une valeur n'efface pas les autres.
  const zoneOptions = useMemo(() => countBy(visibleCartOrders, zoneOf), [visibleCartOrders]);
  const periodeOptions = useMemo(() => countBy(visibleCartOrders, periodeOf), [visibleCartOrders]);
  const heureOptions = useMemo(() => countBy(visibleCartOrders, heureOf), [visibleCartOrders]);

  const filterChips = useMemo(
    () => [
      { kind: "zone" as CartFilterKind, value: zoneFilter },
      { kind: "periode" as CartFilterKind, value: periodeFilter },
      { kind: "heure" as CartFilterKind, value: heureFilter },
    ],
    [zoneFilter, periodeFilter, heureFilter],
  );

  const setFilterValue = (kind: CartFilterKind, value: string | null) => {
    if (kind === "zone") setZoneFilter(value);
    else if (kind === "periode") setPeriodeFilter(value);
    else setHeureFilter(value);
  };

  const optionsFor = (kind: CartFilterKind | null) =>
    kind === "zone" ? zoneOptions : kind === "periode" ? periodeOptions : kind === "heure" ? heureOptions : [];

  const valueFor = (kind: CartFilterKind | null) =>
    kind === "zone" ? zoneFilter : kind === "periode" ? periodeFilter : kind === "heure" ? heureFilter : null;

  return {
    openFilterKind,
    setOpenFilterKind,
    filteredCartOrders,
    filterChips,
    setFilterValue,
    optionsFor,
    valueFor,
  };
};
