import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';
import type { WalletNetwork } from './walletNetwork';

interface WithdrawPayload {
  amount: number;              // montant REÇU sur le numéro de réception
  phone: string;
  network: WalletNetwork;      // réseau du numéro de réception (détecté)
  sourceNetwork: WalletNetwork; // solde débité, choisi par l'utilisateur
  receiverName: string;        // email du user
}

/** Devis renvoyé par GET /wallet/withdraw/quote. */
export interface WithdrawQuote {
  amount: number;
  fee: number;          // 0 même réseau ; frais interréseau sinon
  totalDebited: number; // amount + fee
  sourceBalance: number;
  sufficient: boolean;
  maxAmount: number;    // plus gros montant recevable depuis ce solde
  sameNetwork: boolean;
}

const authHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Aucun utilisateur connecté');
  const idToken = await currentUser.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
};

export const withdrawService = {
  /**
   * Lance un retrait. Le marchand est déduit du token Firebase.
   * Réponse attendue : { success, data: { withdrawal, status: 'pending' } }.
   * Le verdict final (completed/failed) arrive ensuite via socket wallet.withdrawal.
   */
  async withdraw(payload: WithdrawPayload): Promise<any> {
    const response = await axios.post(`${Config.apiUrl}/wallet/withdraw`, payload, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  /** Frais d'un retrait avant confirmation (rien n'est débité). */
  async quote(params: { amount: number; network: WalletNetwork; sourceNetwork: WalletNetwork }): Promise<WithdrawQuote> {
    const response = await axios.get(`${Config.apiUrl}/wallet/withdraw/quote`, {
      params,
      headers: await authHeaders(),
    });
    return response.data.data;
  },

  /** Réseau d'un numéro saisi (relais backend, clé MobileWallet côté serveur). */
  async predictOperator(phone: string): Promise<{ phone: string | null; network: WalletNetwork }> {
    const response = await axios.post(
      `${Config.apiUrl}/wallet/operator/predict`,
      { phone },
      { headers: await authHeaders() },
    );
    return response.data.data;
  },
};
