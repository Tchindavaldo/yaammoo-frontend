import { useMemo } from "react";
import { Commande } from "@/src/types";
import {
  formatDateLabel,
  getOrderDateISO,
  periodKeyOf,
} from "@/src/features/orders/components/CartStatusPanel.parts";

interface Params {
  /** Commandes du statut actif. */
  statusList: Commande[];
  pending: Commande[];
  active: Commande[];
  finished: Commande[];
  delivered: Commande[];
  selectedFastFoodId: string | null;
  todayISO: string;
  activeDateISO: string;
}

/**
 * Options et compteurs du bottom sheet de filtres de `CartStatusPanel`
 * (dates futures/passées, périodes, badges des cards et des chips).
 */
export const useClientFilterOptions = ({
  statusList,
  pending,
  active,
  finished,
  delivered,
  selectedFastFoodId,
  todayISO,
  activeDateISO,
}: Params) => {
  /** Commandes du statut actif, filtrées sur le fastfood sélectionné. */
  const scopedOrders = useMemo(
    () =>
      statusList.filter(
        (o: any) => !selectedFastFoodId || o.fastFoodId === selectedFastFoodId,
      ),
    [statusList, selectedFastFoodId],
  );

  const { futureDateOptions, pastDateOptions } = useMemo(() => {
    const isos = [...new Set(scopedOrders.map(getOrderDateISO))].filter(Boolean);
    const toOptions = (list: string[]) =>
      list.map((iso) => ({ iso, label: formatDateLabel(iso) }));
    return {
      futureDateOptions: toOptions(isos.filter((d) => d > todayISO).sort()),
      pastDateOptions: toOptions(
        isos.filter((d) => d < todayISO).sort().reverse(),
      ),
    };
  }, [scopedOrders, todayISO]);

  /** Périodes de la date active, avec leur nombre de commandes. */
  const availablePeriods = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedOrders.forEach((o: any) => {
      if (getOrderDateISO(o) !== activeDateISO) return;
      const k = periodKeyOf(o);
      counts[k] = (counts[k] || 0) + 1;
    });
    const slots = Object.keys(counts)
      .filter((k) => k !== "express" && k !== "surplace")
      .sort();
    // Les deux modes de livraison sont TOUJOURS listés (0 si aucune commande)
    // et dans le MÊME ORDRE que côté marchand : express, sur place, créneaux.
    // Sinon les cards apparaissent/disparaissent au changement de date.
    return [
      {
        key: "express",
        label: "Livraison express",
        count: counts.express || 0,
      },
      {
        key: "surplace",
        label: "Récupérer\nsur place",
        count: counts.surplace || 0,
      },
      ...slots.map((k) => ({ key: k, label: k, count: counts[k] })),
    ];
  }, [scopedOrders, activeDateISO]);

  const allPeriodsCount = useMemo(
    () => availablePeriods.reduce((acc, p) => acc + p.count, 0),
    [availablePeriods],
  );

  // Badges des cards de dates du filter sheet : NOMBRE DE COMMANDES du lot
  // (dates futures / aujourd'hui / dates passées), pas le nombre de dates.
  // Volontairement INDÉPENDANTS de l'onglet de statut ET des périodes cochées :
  // chaque card affiche toujours le total de SA période.
  const dateScopeCounts = useMemo(() => {
    const all = [...pending, ...active, ...finished, ...delivered];
    let past = 0;
    let today = 0;
    let future = 0;
    all.forEach((o: any) => {
      if (selectedFastFoodId && o.fastFoodId !== selectedFastFoodId) return;
      const iso = getOrderDateISO(o);
      if (!iso) return;
      if (iso < todayISO) past += 1;
      else if (iso > todayISO) future += 1;
      else today += 1;
    });
    return { past, today, future };
  }, [pending, active, finished, delivered, selectedFastFoodId, todayISO]);

  /**
   * Badges des chips : comptés sur la date active (+ fastfood sélectionné),
   * pas sur le total tous jours confondus.
   */
  const chipCounts = useMemo(() => {
    const matches = (list: Commande[]) =>
      list.filter((o: any) => {
        if (selectedFastFoodId && o.fastFoodId !== selectedFastFoodId)
          return false;
        // TOUTES périodes confondues : indépendant de `selectedPeriods`, comme
        // les chips de statut du sheet marchand.
        return getOrderDateISO(o) === activeDateISO;
      }).length;
    return {
      pending: matches(pending),
      active: matches(active),
      finished: matches([...finished, ...delivered]),
    };
  }, [pending, active, finished, delivered, selectedFastFoodId, activeDateISO]);

  return {
    futureDateOptions,
    pastDateOptions,
    availablePeriods,
    allPeriodsCount,
    dateScopeCounts,
    chipCounts,
  };
};
