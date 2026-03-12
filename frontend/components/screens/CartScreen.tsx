'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CartItemCard, CartSummary } from '@/components/Cart';

export function CartScreen() {
  const cart = useAppStore((s) => s.cart);
  const navigateScreen = useAppStore((s) => s.navigateScreen);
  const showPaymentQR = useAppStore((s) => s.showPaymentQR);

  const total = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const tax = total * 0.08;
  const finalTotal = total + tax;

  const handleCheckout = () => {
    showPaymentQR(finalTotal);
  };

  return (
    <div className="p-4">
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigateScreen('home')}
        className="flex items-center gap-2 text-surface-600 hover:text-surface-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Menu</span>
      </motion.button>

      <h2 className="text-2xl font-bold text-surface-800 mb-4">Your Order</h2>

      {cart.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-surface-500 text-lg">Your cart is empty</p>
          <p className="text-surface-400 mt-2">Add some items to get started</p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <AnimatePresence>
              {cart.map((item, index) => (
                <CartItemCard key={item.id} item={item} index={index} />
              ))}
            </AnimatePresence>
          </div>
          
          <div>
            <CartSummary onCheckout={handleCheckout} />
          </div>
        </div>
      )}
    </div>
  );
}
