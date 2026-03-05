'use client';

import { motion } from 'framer-motion';
import { Coffee, Croissant, Cake, UtensilsCrossed } from 'lucide-react';
import { ScreenName } from '@/lib/types';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'coffee' as ScreenName, name: 'Coffee', icon: Coffee },
  { id: 'bakery' as ScreenName, name: 'Bakery', icon: Croissant },
  { id: 'cake' as ScreenName, name: 'Cake', icon: Cake },
  { id: 'food' as ScreenName, name: 'Food', icon: UtensilsCrossed },
];

export function CategoryNav() {
  const { screen, navigateScreen } = useAppStore();

  return (
    <div className="flex gap-2 p-4 overflow-x-auto">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = screen === category.id;

        return (
          <motion.button
            key={category.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateScreen(category.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-full font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-primary-500 text-white shadow-lg'
                : 'bg-white text-surface-600 hover:bg-surface-100'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{category.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
