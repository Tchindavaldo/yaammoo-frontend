import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Config } from '@/src/api/config';

const app = initializeApp(Config.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
