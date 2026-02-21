import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Users } from '@/src/types';
import { userToJSON, jsonToUser } from '../utils/userMappers';

export const userFirestore = {
    async getUser(idx: string): Promise<Users | null> {
        try {
            const docRef = doc(db, 'users', idx);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.user ? jsonToUser(data.user) : null;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    },

    async saveUser(user: Users, idx: string): Promise<void> {
        try {
            const docRef = doc(db, 'users', idx);
            await setDoc(docRef, { user: userToJSON(user) });
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    },

    async findUserByPhoneAndUid(totalUsers: number, phone: number, uid: string): Promise<Users | null> {
        // Note: The original project iterates through all users. 
        // In a real project, we'd use a query. 
        // But keeping original logic for now as requested "on migre juste de technologie".
        for (let i = 0; i < totalUsers; i++) {
            const user = await this.getUser(i.toString());
            if (user && user.infos.numero === phone && user.infos.uid === uid) {
                return user;
            }
        }
        return null;
    }
};
