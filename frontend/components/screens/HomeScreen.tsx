'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Coffee, Croissant, Cake, UtensilsCrossed } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ScreenName } from '@/lib/types';
import { categories } from '@/lib/websiteData';

const iconMap = {
  Coffee,
  Croissant,
  Cake,
  UtensilsCrossed,
};

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
          const Icon = iconMap[category.icon as keyof typeof iconMap];
          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigateScreen(category.id as ScreenName)}
              className="relative rounded-2xl overflow-hidden text-white text-left shadow-lg aspect-square"
            >
              {/* Background Image */}
              <Image
                src={category.thumbnail}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
                priority
              />
              
              {/* Subtle dark gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              
              {/* Content */}
              <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                <Icon className="w-10 h-10 drop-shadow-lg" />
                <div className={`bg-gradient-to-br ${category.color} opacity-90 rounded-xl px-4 py-3`}>
                  <h3 className="text-xl font-bold">{category.name}</h3>
                  <p className="text-sm opacity-90 mt-1">{category.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
