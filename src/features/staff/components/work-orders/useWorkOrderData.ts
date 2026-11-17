"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de merchant/components/OrderManagePanel (R16) pour le mode travail :
// statut impose par l'onglet de la navbar, pas de barre basse, filtres ouverts par le header.
import { useEffect, useMemo } from "react";
import { Commande, OrderStatus } from "@/src/types";
import { orderGroupKey } from "@/src/features/merchant/utils/orderGroupKey";
import { t as tr, dateLocale } from "@/src/i18n";

export type StatusTab = "pending" | "proccess" | "finish";

export interface DateOption {
  iso: string;
  label: string;
  count?: number;
}

interface Params {
  orders: Commande[];
  selectedStatus: StatusTab;
  selectedDate: string | null;
  selectedPeriods: string[];
  setSelectedPeriods: React.Dispatch<React.SetStateAction<string[]>>;
  i18nLang: unknown;
  onDatesChange?: (dates: DateOption[]) => void;
}

/** Donnees derivees de la liste (filtres date / periode / statut, compteurs, groupes). */
export function useWorkOrderData({ orders, selectedStatus, selectedDate, selectedPeriods, setSelectedPeriods, i18nLang, onDatesChange }: Params) {
  // Helpers de date : retourne YYYY-MM-DD à partir d'une commande (clé stable)
  const getOrderDateISO = (order: Commande): string => {
    const deliveryDate = order.delivery?.date;
    const dateStr = deliveryDate || order.createdAt || "";
    if (!dateStr) return new Date().toISOString().substring(0, 10);
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().substring(0, 10);
      return d.toISOString().substring(0, 10);
    } catch {
      return new Date().toISOString().substring(0, 10);
    }
  };

  const todayISO = new Date().toISOString().substring(0, 10);

  // Format d'affichage pour un chip / header de section : "10 juin" (jour chiffré + mois).
  const formatDateLabel = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(dateLocale(), { day: "numeric", month: "long" });
    } catch {
      return iso;
    }
  };

  const statusMap: Record<StatusTab, OrderStatus[]> = {
    pending: ["pending"],
    proccess: ["processing"],
    finish: ["finished", "delivering", "delivered"],
  };

  const filteredOrders = orders.filter((o) =>
    statusMap[selectedStatus].includes(o.status),
  );

  // Dates uniques (ISO YYYY-MM-DD) disponibles pour ce statut
  const availableDateISOs = useMemo(() => {
    return [...new Set(filteredOrders.map(getOrderDateISO))];
  }, [filteredOrders]);

  // Ordre des chips : futures (asc) → aujourd'hui → passées (desc)
  const sortedDateISOs = useMemo(() => {
    const futures = availableDateISOs.filter((d) => d > todayISO).sort();
    const past = availableDateISOs
      .filter((d) => d < todayISO)
      .sort()
      .reverse();
    const hasToday = availableDateISOs.includes(todayISO);
    return [...futures, ...(hasToday ? [todayISO] : []), ...past];
  }, [availableDateISOs]);

  // Sections passées (uniquement pour la vue par défaut pending/processing)
  const pastDateISOs = useMemo(() => {
    return availableDateISOs
      .filter((d) => d < todayISO)
      .sort()
      .reverse();
  }, [availableDateISOs]);

  // Dates de TOUTES les commandes, tous statuts confondus. `availableDateISOs`
  // ne voit que le statut de l'onglet actif : s'en servir pour les rappels
  // masquerait « des commandes à venir » sur En cours quand ces commandes sont
  // encore en attente. Les rappels parlent du planning, pas de l'onglet.
  const allDateISOs = useMemo(
    () => [...new Set(orders.map(getOrderDateISO))],
    [orders],
  );

  // Remonte au header la liste des dates disponibles (chips).
  // Dépend d'une clé string stable (et pas du tableau, recréé à chaque render)
  // pour éviter une boucle setState → render → nouveau tableau → effet.
  const datesKey = sortedDateISOs.join(",");
  useEffect(() => {
    onDatesChange?.(
      sortedDateISOs.map((iso) => ({ iso, label: formatDateLabel(iso) })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datesKey]);

  // Trie par rank pour pending/proccess
  const sortByRank = (arr: Commande[]) => {
    return [...arr].sort((a, b) => {
      const ra = (a as any).rank ?? Infinity;
      const rb = (b as any).rank ?? Infinity;
      return ra - rb;
    });
  };

  // ─── Groupement des commandes d'un même client ──────────────────────────────
  // Une seule ligne par groupe : on n'affiche que la commande la mieux classée
  // (rank le plus petit) et le bottom sheet reçoit tout le groupe. Le regroupement
  // se fait par `orderGroupKey` (règle partagée avec l'onglet Montant du sheet),
  // sans condition de rangs consécutifs.
  const groupBySlot = (
    arr: Commande[],
  ): { head: Commande; group: Commande[] }[] => {
    const buckets = new Map<string, Commande[]>();

    arr.forEach((o) => {
      const key = orderGroupKey(o);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(o);
      else buckets.set(key, [o]);
    });

    const rankOf = (o: Commande) => (o as any).rank ?? Infinity;
    const entries: { head: Commande; group: Commande[] }[] = [];

    buckets.forEach((group) => {
      // Ordonne le groupe par rang : la tête est la commande la mieux classée.
      const sorted = [...group].sort((a, b) => rankOf(a) - rankOf(b));
      entries.push({ head: sorted[0], group: sorted });
    });

    // La ligne prend la position de sa commande la mieux classée.
    return entries.sort((a, b) => rankOf(a.head) - rankOf(b.head));
  };

  // Commandes filtrées :
  //  - Si un chip de date est sélectionné → uniquement cette date
  //  - Sinon → uniquement aujourd'hui (la liste principale)
  //    Pour pending/proccess, les dates passées non traitées sont rendues en sections sous la liste.
  //    Pour finish, on n'affiche jamais l'historique en dessous : seulement la date sélectionnée.
  // Clé de période d'une commande : "express", "surplace", ou le créneau ("12h").
  const periodKeyOf = (o: Commande): string => {
    const d = (o as any).delivery;
    if (d?.status !== true) return "surplace";
    if (d?.type === "express") return "express";
    return d?.time || tr("À définir");
  };

  const dateFilteredOrders = useMemo(() => {
    const isoFilter = selectedDate || todayISO;
    let filtered = filteredOrders.filter(
      (o) => getOrderDateISO(o) === isoFilter,
    );
    // Multi-sélection : vide = toutes les périodes.
    if (selectedPeriods.length > 0) {
      filtered = filtered.filter((o) =>
        selectedPeriods.includes(periodKeyOf(o)),
      );
    }
    if (selectedStatus === "pending" || selectedStatus === "proccess") {
      return sortByRank(filtered);
    }
    return filtered;
  }, [filteredOrders, selectedDate, selectedStatus, selectedPeriods]);

  // Périodes disponibles pour la date active : express / sur place puis créneaux,
  // avec le NOMBRE de commandes de chacune (compté sur la date active, statut courant).
  const availablePeriods = useMemo(() => {
    const isoFilter = selectedDate || todayISO;
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      if (getOrderDateISO(o) !== isoFilter) return;
      const k = periodKeyOf(o);
      counts[k] = (counts[k] || 0) + 1;
    });
    const slots = Object.keys(counts)
      .filter((k) => k !== "express" && k !== "surplace")
      .sort();
    // Les deux modes de livraison sont TOUJOURS listés (0 si aucune commande) :
    // sinon les lignes apparaissent/disparaissent au changement de date.
    return [
      {
        key: "express",
        label: tr("Livraison express"),
        count: counts.express || 0,
      },
      {
        key: "surplace",
        label: tr("Récupérer\nsur place"),
        count: counts.surplace || 0,
      },
      ...slots.map((s) => ({ key: s, label: s, count: counts[s] })),
    ];
  }, [filteredOrders, selectedDate, i18nLang]);

  // Total de la date active (toutes périodes) pour le libellé « Toutes les périodes ».
  const allPeriodsCount = useMemo(
    () => availablePeriods.reduce((acc, p) => acc + p.count, 0),
    [availablePeriods],
  );

  // Une période cochée qui disparaît (changement de date/statut) est retirée.
  const periodsKey = availablePeriods.map((p) => p.key).join(",");
  useEffect(() => {
    setSelectedPeriods((prev) => {
      const keys = periodsKey ? periodsKey.split(",") : [];
      const next = prev.filter((p) => keys.includes(p));
      return next.length === prev.length ? prev : next;
    });
  }, [periodsKey]);

  // Lignes affichées : une entrée par ligne de liste, avec son groupe éventuel.
  const displayRows = useMemo(() => {
    if (selectedStatus !== "pending" && selectedStatus !== "proccess") {
      return dateFilteredOrders.map((o) => ({ head: o, group: [o] }));
    }
    return groupBySlot(dateFilteredOrders);
  }, [dateFilteredOrders, selectedStatus]);

  const emptyLabel =
    selectedStatus === "pending"
      ? tr("Aucune commande en attente")
      : selectedStatus === "proccess"
        ? tr("Aucune commande en cours")
        : tr("Aucune commande terminée");

  // Badges des chips de statut : ils comptent les commandes de la DATE ACTIVE,
  // TOUTES périodes confondues (express + sur place + créneaux) — pas le total
  // tous jours confondus, qui ferait afficher des commandes passées dans le
  // badge du jour affiché. Volontairement INDÉPENDANTS de `selectedPeriods` :
  // le marchand veut la somme du jour même quand une seule card est cochée.
  const counts = useMemo(() => {
    const isoFilter = selectedDate || todayISO;
    const scoped = orders.filter((o) => getOrderDateISO(o) === isoFilter);
    return {
      pending: scoped.filter((o) => statusMap.pending.includes(o.status))
        .length,
      proccess: scoped.filter((o) => statusMap.proccess.includes(o.status))
        .length,
      finish: scoped.filter((o) => statusMap.finish.includes(o.status)).length,
    };
    // `statusMap` / `todayISO` sont recréés à chaque rendu : les lister ici
    // annulerait la mémoïsation (même convention que `dateFilteredOrders`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, selectedDate]);

  const totalAmount = dateFilteredOrders.reduce(
    (acc, o) => acc + (o.total || 0),
    0,
  );

  // Dates du sheet : à venir (hors aujourd'hui) et passées. Les dates futures
  // viennent de TOUTES les commandes, en cohérence avec le rappel `hasFuture` :
  // les scoper à l'onglet ouvrirait un sheet sans la date qu'on vient
  // d'annoncer.
  // Pastille des chips de dates : commandes de CHAQUE jour dans l'onglet de
  // statut actif (le statut est deja filtre en haut du sheet).
  const perDayStatusCount = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => {
      if (!statusMap[selectedStatus].includes(o.status)) return;
      const iso = getOrderDateISO(o);
      m[iso] = (m[iso] ?? 0) + 1;
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, selectedStatus]);

  const futureDateOptions = useMemo(
    () =>
      allDateISOs
        .filter((d) => d > todayISO)
        .sort()
        .map((iso) => ({ iso, label: formatDateLabel(iso), count: perDayStatusCount[iso] ?? 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allDateISOs, perDayStatusCount],
  );
  const pastDateOptions = useMemo(
    () => pastDateISOs.map((iso) => ({ iso, label: formatDateLabel(iso), count: perDayStatusCount[iso] ?? 0 })),
    [pastDateISOs, perDayStatusCount],
  );

  // Badges des cards de dates du filter sheet : NOMBRE DE COMMANDES du lot
  // (toutes dates futures / aujourd'hui / toutes dates passées), pas le nombre
  // de dates. Volontairement INDÉPENDANTS de l'onglet de statut ET des périodes
  // cochées : chaque card affiche toujours le total de SA période.
  // En revanche on ne compte que les VRAIES commandes : `orders` est le pool
  // brut de la boutique et contient aussi `pendingToBuy` (encore au panier du
  // client) et les annulées, qui gonflaient le compteur.
  const dateScopeCounts = useMemo(() => {
    const countable = new Set([
      ...statusMap.pending,
      ...statusMap.proccess,
      ...statusMap.finish,
    ]);
    let past = 0;
    let today = 0;
    let future = 0;
    orders.forEach((o) => {
      if (!countable.has(o.status)) return;
      const iso = getOrderDateISO(o);
      if (iso < todayISO) past += 1;
      else if (iso > todayISO) future += 1;
      else today += 1;
    });
    return { past, today, future };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const statusTabs: { key: StatusTab; label: string; icon: string }[] = [
    { key: "pending", label: tr("En Attente"), icon: "time-outline" },
    { key: "proccess", label: tr("En cours"), icon: "restaurant-outline" },
    { key: "finish", label: tr("Terminées"), icon: "checkmark-done-outline" },
  ];

  // Grouping logic for the finished orders design (Untitled-1 style)
  const deliveryData = useMemo(() => {
    if (selectedStatus !== "finish") return null;

    const express: Commande[] = [];
    const surplace: Commande[] = [];
    const scheduled: Record<string, Commande[]> = {};

    dateFilteredOrders.forEach((o) => {
      const d = (o as any).delivery;
      const hasDelivery = d?.status === true;
      if (!hasDelivery) {
        surplace.push(o);
        return;
      }
      if (d?.type === "express") {
        express.push(o);
      } else {
        const slot = d?.time || tr("À définir");
        if (!scheduled[slot]) scheduled[slot] = [];
        scheduled[slot].push(o);
      }
    });

    const groupByUser = (ordersArr: Commande[]) => {
      const userMap: Record<string, Commande[]> = {};
      ordersArr.forEach((o) => {
        const u = o.userData;
        const key = o.userId || u?.email || o.id || `anon_${Math.random()}`;
        if (!userMap[key]) userMap[key] = [];
        userMap[key].push(o);
      });
      return Object.values(userMap);
    };

    return {
      expressGroups: groupByUser(express),
      surplaceGroups: groupByUser(surplace),
      slots: Object.entries(scheduled).map(([slot, orders]) => ({
        title: slot,
        userGroups: groupByUser(orders),
      })),
    };

  return {
    todayISO,
    dateFilteredOrders,
    availablePeriods,
    allPeriodsCount,
    displayRows,
    emptyLabel,
    counts,
    totalAmount,
    futureDateOptions,
    pastDateOptions,
    dateScopeCounts,
    statusTabs,
    deliveryData,
  };
}

export type DeliveryData = NonNullable<ReturnType<typeof useWorkOrderData>["deliveryData"]>;
