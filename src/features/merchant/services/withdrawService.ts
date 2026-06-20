import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';

interface WithdrawPayload {
  amount: number;
  phone: string;
  network: string;       // "Orangemoney" | "MTN"
  receiverName: string;  // email du user
}

export const withdrawService = {
  /**
   * Lance un retrait. Le marchand est déduit du token Firebase.
   * Réponse attendue : { success, data: { withdrawalId, status: 'pending', ... } }.
   * Le verdict final (completed/failed) arrive ensuite via socket wallet.withdrawal.
   */
  async withdraw(payload: WithdrawPayload): Promise<any> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Aucun utilisateur connecté');

    const idToken = await currentUser.getIdToken();
    const response = await axios.post(`${Config.apiUrl}/wallet/withdraw`, payload, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return response.data;
  },
};
