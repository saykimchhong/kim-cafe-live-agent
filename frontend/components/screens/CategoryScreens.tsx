'use client';

import { MenuGrid } from '@/components/Menu';
import { getMenuByCategory } from '@/lib/mockData';

export function CoffeeScreen() {
  const items = getMenuByCategory('coffee');
  return <MenuGrid items={items} />;
}

export function BakeryScreen() {
  const items = getMenuByCategory('bakery');
  return <MenuGrid items={items} />;
}

export function CakeScreen() {
  const items = getMenuByCategory('cake');
  return <MenuGrid items={items} />;
}

export function FoodScreen() {
  const items = getMenuByCategory('food');
  return <MenuGrid items={items} />;
}
