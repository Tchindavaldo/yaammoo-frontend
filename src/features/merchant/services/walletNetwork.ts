/**
 * Réseaux du portefeuille : deux soldes, MTN et Orange.
 *
 * Valeurs EXACTES attendues par le backend (`/wallet/withdraw`, `/wallet/withdraw/quote`) :
 * "MTN" | "ORANGEMONEY". Service pur, partagé (pas de rendu).
 */
export type WalletNetwork = "MTN" | "ORANGEMONEY";

export interface WalletBalances {
  mtn: number;
  orange: number;
}

export const WALLET_NETWORKS: WalletNetwork[] = ["MTN", "ORANGEMONEY"];

/** Découpage d'un solde : commandes (plats + courses) + réserve de frais de retrait. */
export interface BalancePart {
  orders: number;
  fees: number;
  total: number;
}
export type WalletBreakdown = Record<keyof WalletBalances, BalancePart>;

/** `{ mtn, orange }` de BalancePart, ou undefined si absent / mal formé. */
export const toBreakdown = (raw: any): WalletBreakdown | undefined => {
  const part = (p: any): BalancePart | undefined => {
    const orders = Number(p?.orders);
    const fees = Number(p?.fees);
    const total = Number(p?.total);
    return [orders, fees, total].every(Number.isFinite) ? { orders, fees, total } : undefined;
  };
  const mtn = part(raw?.mtn);
  const orange = part(raw?.orange);
  return mtn && orange ? { mtn, orange } : undefined;
};

/** Libellé affiché (aucun nom d'agrégateur, jamais). */
export const networkLabel = (n?: WalletNetwork | null) =>
  n === "ORANGEMONEY" ? "Orange" : n === "MTN" ? "MTN" : "";

/** Clé du solde dans `balances`. */
export const balanceKey = (n: WalletNetwork): keyof WalletBalances =>
  n === "ORANGEMONEY" ? "orange" : "mtn";

/** Normalise un libellé libre ("Orangemoney", "mtn"…) ; inconnu → undefined. */
export const toWalletNetwork = (raw: unknown): WalletNetwork | undefined => {
  const v = String(raw ?? "").toLowerCase();
  if (v.includes("mtn")) return "MTN";
  if (v.includes("orange")) return "ORANGEMONEY";
  return undefined;
};

/** `{ mtn, orange }` numériques, ou undefined si le payload n'en porte pas. */
export const toBalances = (raw: any): WalletBalances | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const mtn = Number(raw.mtn);
  const orange = Number(raw.orange);
  if (!Number.isFinite(mtn) || !Number.isFinite(orange)) return undefined;
  return { mtn, orange };
};

/** Montant FCFA lisible : 12 500. */
export const formatFcfa = (n: number) =>
  `${Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
