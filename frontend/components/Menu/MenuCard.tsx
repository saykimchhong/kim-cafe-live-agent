'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { MenuItem } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

interface MenuCardProps {
  item: MenuItem;
  index?: number;
}

export function MenuCard({ item, index = 0 }: MenuCardProps) {
  const { highlightedItem, selectItem, shouldShowAIBadge } = useAppStore();
  const isHighlighted = highlightedItem === item.id;
  const showAIBadge = shouldShowAIBadge(item.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isHighlighted ? 1.05 : 1,
      }}
      transition={{ 
        delay: index * 0.05,
        scale: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      whileHover={{ scale: isHighlighted ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => selectItem(item, true)}
      className={cn(
        'bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer transition-all duration-300 relative',
        isHighlighted && 'ring-4 ring-primary-400 shadow-xl shadow-primary-200/50'
      )}
    >
      {/* AI Highlight Badge */}
      <AnimatePresence>
        {showAIBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-2 -right-2 z-10 bg-primary-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg"
          >
            <Sparkles className="w-3 h-3" />
            AI Pick
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlight pulse overlay */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-primary-400/20 pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      <div className="aspect-square bg-surface-100 relative overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
          priority={index < 4}
        />
        {/* Gradient overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
      
      <div className="p-4 relative z-10">
        <h3 className="font-semibold text-surface-800 truncate">{item.name}</h3>
        <p className="text-primary-600 font-bold mt-1">{formatPrice(item.price)}</p>
      </div>
    </motion.div>
  );
}
