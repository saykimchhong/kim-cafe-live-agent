'use client';

import { useAppStore } from '@/stores/useAppStore';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui';

interface CartSummaryProps {
  onCheckout: () => void;
}

export function CartSummary({ onCheckout }: CartSummaryProps) {
  const cart = useAppStore((s) => s.cart);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h3 className="text-lg font-semibold text-surface-800 mb-4">Order Summary</h3>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-surface-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-surface-600">
          <span>Tax (8%)</span>
          <span>{formatPrice(tax)}</span>
        </div>
        <div className="border-t border-surface-200 pt-3">
          <div className="flex justify-between text-lg font-bold text-surface-800">
            <span>Total</span>
            <span className="text-primary-600">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={onCheckout}
        disabled={cart.length === 0}
      >
        Proceed to Payment
      </Button>
    </div>
  );
}
