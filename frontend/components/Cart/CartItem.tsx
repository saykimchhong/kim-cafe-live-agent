'use client';

import { motion } from 'framer-motion';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

interface CartItemProps {
  item: CartItemType;
  index?: number;
}

export function CartItemCard({ item, index = 0 }: CartItemProps) {
  const updateCartQuantity = useAppStore((s) => s.updateCartQuantity);
  const removeFromCart = useAppStore((s) => s.removeFromCart);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm"
    >
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
        <span className="text-2xl">
          {item.menuItem.category === 'coffee' && '☕'}
          {item.menuItem.category === 'bakery' && '🥐'}
          {item.menuItem.category === 'cake' && '🍰'}
          {item.menuItem.category === 'food' && '🥗'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-surface-800 truncate">{item.menuItem.name}</h4>
        {item.customization && (
          <p className="text-sm text-surface-500">{item.customization}</p>
        )}
        <p className="text-primary-600 font-bold mt-1">
          {formatPrice(item.menuItem.price * item.quantity)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
          className="p-1.5 rounded-full bg-surface-100 hover:bg-surface-200 transition-colors"
        >
          <Minus className="w-4 h-4 text-surface-600" />
        </button>
        <span className="w-6 text-center font-semibold text-surface-800">{item.quantity}</span>
        <button
          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
          className="p-1.5 rounded-full bg-surface-100 hover:bg-surface-200 transition-colors"
        >
          <Plus className="w-4 h-4 text-surface-600" />
        </button>
        <button
          onClick={() => removeFromCart(item.id)}
          className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 transition-colors ml-2"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </motion.div>
  );
}
