'use client';

import { useAppStore } from '@/stores/useAppStore';
import { PaymentQR, PaymentSuccess } from '@/components/Payment';
import { KimActive } from '@/components/Kim';

export function PaymentScreen() {
  const { paymentAmount, isPaymentSuccess, completePayment, setKimMessage, setKimState } = useAppStore();

  const handlePaymentComplete = () => {
    completePayment();
    setKimMessage('Payment received! Thank you for ordering with us. Have a wonderful day!');
    setKimState('speaking');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-surface-50 to-surface-100">
      <KimActive />
      
      <div className="mt-8">
        {isPaymentSuccess ? (
          <PaymentSuccess />
        ) : (
          <PaymentQR amount={paymentAmount} onPaymentComplete={handlePaymentComplete} />
        )}
      </div>
    </div>
  );
}
