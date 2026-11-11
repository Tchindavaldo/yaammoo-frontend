import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';
import type { WalletNetwork } from './walletNetwork';
import { t } from "@/src/i18n";

interface WithdrawPayload {
  amount: number;              // espèces voulues (envoyé = amount + frais kiosque)
  phone: string;
  network: WalletNetwork;      // réseau du numéro de réception (détecté)
  sourceNetwork: WalletNetwork; // solde débité, choisi par l'utilisateur
  receiverName: string;        // email du user
}

/** Devis renvoyé par GET /wallet/withdraw/quote. */
export interface WithdrawQuote {
  amount: number;       // espèces voulues
  kioskFee?: number;    // frais de retrait kiosque (réseau de réception)
  sentAmount?: number;  // envoyé au téléphone = amount + kioskFee
  fee: number;          // 0 même réseau ; frais interréseau sinon
  totalDebited: number; // sentAmount + fee
  sourceBalance: number;
  sufficient: boolean;
  maxAmount: number;    // plus gros montant recevable depuis ce solde
  sameNetwork: boolean;
}

/** Numéro de réception par réseau (9 chiffres, sans indicatif). */
export type PayoutNumbers = Partial<Record<WalletNetwork, string>>;

const authHeaders = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error(t("Aucun utilisateur connecté"));
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

  /**
   * Numéros de réception configurés dans les informations de la boutique
   * (`GET /fastfood/:id`) : `momoNumber` pour MTN, `number` pour Orange Money.
   * Numéro absent ou vide → clé absente (carte vide dans la feuille).
   */
  async getPayoutNumbers(fastFoodId: string): Promise<PayoutNumbers> {
    const response = await axios.get(`${Config.apiUrl}/fastfood/${fastFoodId}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    const data = response.data?.data ?? {};
    const clean = (v: unknown) => {
      const d = String(v ?? "").replace(/\D/g, "").replace(/^237(?=\d{9}$)/, "");
      return d.length >= 9 ? d : undefined;
    };
    return { MTN: clean(data.momoNumber), ORANGEMONEY: clean(data.number) };
  },
};
