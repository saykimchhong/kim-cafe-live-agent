'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

interface PaymentQRProps {
  amount: number;
  onPaymentComplete: () => void;
}

export function PaymentQR({ amount, onPaymentComplete }: PaymentQRProps) {
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  
  // Use refs to avoid effect re-running
  const onPaymentCompleteRef = useRef(onPaymentComplete);
  onPaymentCompleteRef.current = onPaymentComplete;

  useEffect(() => {
    // Start countdown timer
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Only complete once
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            
            // Send payment_complete message to backend
            const sendMessage = useAppStore.getState().sendMessage;
            if (sendMessage) {
              sendMessage({ type: 'payment_complete' });
            }
            
            // Trigger completion callback
            setTimeout(() => {
              onPaymentCompleteRef.current();
            }, 100);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // Empty deps - run once on mount

  // Generate stable QR pattern once
  const qrPattern = useMemo(() => {
    return Array.from({ length: 25 }).map(() => Math.random() > 0.3);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <div className="w-48 h-48 bg-surface-100 rounded-xl flex items-center justify-center mb-4">
          <div className="grid grid-cols-5 gap-1">
            {qrPattern.map((isDark, i) => (
              <div
                key={i}
                className={`w-3 h-3 ${isDark ? 'bg-surface-800' : 'bg-white'}`}
              />
            ))}
          </div>
        </div>
        
        <p className="text-center text-surface-600 mb-2">Scan to pay</p>
        <p className="text-center text-2xl font-bold text-primary-600">
          {formatPrice(amount)}
        </p>
      </div>

      <motion.div
        className="mt-6 flex items-center gap-3 text-surface-500"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <span>Processing in {countdown}s...</span>
      </motion.div>
    </motion.div>
  );
}

export function PaymentSuccess() {
  const { resetSession } = useAppStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      resetSession();
    }, 5000);

    return () => clearTimeout(timer);
  }, [resetSession]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle className="w-12 h-12 text-green-500" />
      </motion.div>

      <h2 className="text-2xl font-bold text-surface-800 mb-2">Payment Successful!</h2>
      <p className="text-surface-500">Thank you for your order</p>
      <p className="text-sm text-surface-400 mt-4">Returning to home...</p>
    </motion.div>
  );
}
