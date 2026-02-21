import { useState, useCallback } from 'react';

export enum PaymentStep {
    CONFIRM = 0,
    BREAKDOWN = 1,
    PHONE_INPUT = 2,
    INSTRUCTIONS = 3,
    SUCCESS = 4
}

export const usePayment = (amount: number) => {
    const [currentStep, setCurrentStep] = useState<PaymentStep>(PaymentStep.CONFIRM);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const cashoutPercentage = 2;
    const feePercentage = 2;

    const calculateTotal = useCallback(() => {
        const cashoutFee = amount * (cashoutPercentage / 100);
        const transFee = amount * (feePercentage / 100);
        return Math.round(amount + cashoutFee + transFee);
    }, [amount]);

    const nextStep = () => {
        if (currentStep < PaymentStep.SUCCESS) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > PaymentStep.CONFIRM) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const processPayment = async () => {
        setLoading(true);
        setCurrentStep(PaymentStep.INSTRUCTIONS);

        // Simulate payment process (as in original app with setTimeout)
        return new Promise((resolve) => {
            setTimeout(() => {
                setCurrentStep(PaymentStep.SUCCESS);
                setLoading(false);
                resolve(true);
            }, 3000);
        });
    };

    return {
        currentStep,
        phoneNumber,
        setPhoneNumber,
        loading,
        totalToPay: calculateTotal(),
        cashoutPercentage,
        feePercentage,
        nextStep,
        prevStep,
        processPayment,
        reset: () => setCurrentStep(PaymentStep.CONFIRM)
    };
};
