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

/** Milliers separes par un espace : 12500 -> "12 500". */
export const groupThousands = (n: number | string) =>
  String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Montant court : "7 412 F". */
export const formatF = (n: number) => `${groupThousands(n)} F`;

/** Numero camerounais sans indicatif : "677123456" -> "6 77 12 34 56". */
export const localDigits = (phone?: string | null) =>
  String(phone ?? "").replace(/\D/g, "").replace(/^237(?=\d{9}$)/, "");

export const formatPhone = (phone?: string | null) => {
  const d = localDigits(phone);
  return d.length === 9
    ? `${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`
    : d;
};

/** Taux en pourcentage, virgule decimale : 1.3 -> "1,3", 1 -> "1". */
export const formatPercent = (p: number) =>
  String(Math.round((Number(p) || 0) * 100) / 100).replace(".", ",");

/** Nom du compte mobile money d'un reseau. */
export const walletLabel = (n?: WalletNetwork | null) =>
  n === "ORANGEMONEY" ? "Orange Money" : n === "MTN" ? "MTN MoMo" : "";

/** Montant FCFA lisible : 12 500. */
export const formatFcfa = (n: number) =>
  `${Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
