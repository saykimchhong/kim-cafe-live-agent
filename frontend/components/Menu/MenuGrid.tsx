'use client';

import { MenuItem } from '@/lib/types';
import { MenuCard } from './MenuCard';

interface MenuGridProps {
  items: MenuItem[];
}

export function MenuGrid({ items }: MenuGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {items.map((item, index) => (
        <MenuCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}
