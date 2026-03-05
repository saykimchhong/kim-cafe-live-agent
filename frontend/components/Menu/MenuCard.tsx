'use client';

import { motion } from 'framer-motion';
import { MenuItem } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

interface MenuCardProps {
  item: MenuItem;
  index?: number;
}

export function MenuCard({ item, index = 0 }: MenuCardProps) {
  const { highlightedItem, selectItem } = useAppStore();
  const isHighlighted = highlightedItem === item.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => selectItem(item)}
      className={cn(
        'bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer transition-all duration-300',
        isHighlighted && 'ring-4 ring-primary-400 animate-glow'
      )}
    >
      <div className="aspect-square bg-surface-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
          <span className="text-4xl">
            {item.category === 'coffee' && '☕'}
            {item.category === 'bakery' && '🥐'}
            {item.category === 'cake' && '🍰'}
            {item.category === 'food' && '🥗'}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-surface-800 truncate">{item.name}</h3>
        <p className="text-primary-600 font-bold mt-1">{formatPrice(item.price)}</p>
      </div>
    </motion.div>
  );
}
