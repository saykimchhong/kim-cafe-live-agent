'use client';

import { motion } from 'framer-motion';
import { Coffee, Croissant, Cake, UtensilsCrossed } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ScreenName } from '@/lib/types';

const categories = [
  {
    id: 'coffee' as ScreenName,
    name: 'Coffee',
    icon: Coffee,
    color: 'from-amber-400 to-amber-600',
    description: 'Freshly brewed specialty coffee',
  },
  {
    id: 'bakery' as ScreenName,
    name: 'Bakery',
    icon: Croissant,
    color: 'from-orange-400 to-orange-600',
    description: 'Baked fresh every morning',
  },
  {
    id: 'cake' as ScreenName,
    name: 'Cakes',
    icon: Cake,
    color: 'from-pink-400 to-pink-600',
    description: 'Sweet treats and desserts',
  },
  {
    id: 'food' as ScreenName,
    name: 'Food',
    icon: UtensilsCrossed,
    color: 'from-green-400 to-green-600',
    description: 'Light meals and salads',
  },
];

export function HomeScreen() {
  const { navigateScreen } = useAppStore();

  return (
    <div className="p-6">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-surface-800 mb-6"
      >
        What would you like today?
      </motion.h2>

      <div className="grid grid-cols-2 gap-4">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateScreen(category.id)}
              className={`bg-gradient-to-br ${category.color} rounded-2xl p-6 text-white text-left shadow-lg aspect-square flex flex-col justify-between`}
            >
              <Icon className="w-10 h-10" />
              <div>
                <h3 className="text-xl font-bold">{category.name}</h3>
                <p className="text-sm opacity-90 mt-1">{category.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
