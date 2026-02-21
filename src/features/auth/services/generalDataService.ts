import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';

export interface GeneralUserData {
    nbrTotalUser: number;
    utilisateurConnecte: number;
    nbrTotalCommande: number;
    montantTotalCmd: number;
}

export const generalDataService = {
    async getUserData(): Promise<GeneralUserData | null> {
        try {
            const docRef = doc(db, 'users', 'general-Data');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.Data as GeneralUserData;
            }
            return null;
        } catch (error) {
            console.error('Error fetching general user data:', error);
            throw error;
        }
    },

    async updateUserData(data: GeneralUserData): Promise<void> {
        try {
            const docRef = doc(db, 'users', 'general-Data');
            await setDoc(docRef, { Data: data });
        } catch (error) {
            console.error('Error updating general user data:', error);
            throw error;
        }
    }
};
