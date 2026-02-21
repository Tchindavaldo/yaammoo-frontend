import { useState } from 'react';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../../services/firebase';
import { getAuthErrorMessage } from '../utils/authErrors';

export const usePhoneAuth = () => {
    const [verificationId, setVerificationId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const verifyCode = async (code: string) => {
        try {
            setLoading(true);
            setError(null);
            const credential = PhoneAuthProvider.credential(verificationId, code);
            const result = await signInWithCredential(auth, credential);
            return result.user;
        } catch (err: any) {
            console.error('Error verifying code:', err);
            setError(getAuthErrorMessage(err.code));
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        verificationId,
        setVerificationId,
        loading,
        error,
        verifyCode,
        setError,
    };
};
