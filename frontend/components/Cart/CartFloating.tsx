'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { formatPrice } from '@/lib/utils';

export function CartFloating() {
  const { cart, navigateScreen, screen } = useAppStore();

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  if (cart.length === 0 || screen === 'cart' || screen === 'payment' || screen === 'home') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigateScreen('cart')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-primary-500 text-white px-6 py-4 rounded-2xl shadow-xl"
      >
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary-600 rounded-full text-xs font-bold flex items-center justify-center">
            {itemCount}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm opacity-90">View Cart</span>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
