import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';

/** Une ligne par jour renvoyée par /wallet/stats (groupBy=day). */
export interface WalletDayStat {
  period: string;   // "2026-06-18"
  payin: number;    // gains du jour
  payout: number;   // retraits du jour
  net: number;      // payin - payout
  count: number;    // nb de transactions du jour
}

export interface WalletStats {
  groupBy: string;
  balance: number;  // solde retirable total (= mtn + orange)
  // Deux soldes, un par réseau qui a encaissé. Absent sur un backend antérieur.
  balances?: { mtn: number; orange: number };
  totals: { payin: number; payout: number; net: number };
  series: WalletDayStat[];
}

type StatsPeriod = 'week' | 'month';

export const walletStatsService = {
  /**
   * Récupère les stats du portefeuille marchand groupées par jour.
   * Le marchand est déduit du token Firebase (aucun userId envoyé).
   */
  async getStats(period: StatsPeriod = 'month'): Promise<WalletStats> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Aucun utilisateur connecté');

    const idToken = await currentUser.getIdToken();
    const response = await axios.get(`${Config.apiUrl}/wallet/stats`, {
      params: { groupBy: 'day', period },
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return response.data.data;
  },
};
