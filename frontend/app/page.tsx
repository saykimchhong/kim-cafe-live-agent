'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, ShoppingCart } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { KimIdle, KimActive } from '@/components/Kim';
import { CategoryNav, ItemDetail } from '@/components/Menu';
import { CartFloating } from '@/components/Cart';
import {
  HomeScreen,
  CoffeeScreen,
  BakeryScreen,
  CakeScreen,
  FoodScreen,
  CartScreen,
  PaymentScreen,
} from '@/components/screens';
import { cn } from '@/lib/utils';

export default function KioskPage() {
  const [isStarted, setIsStarted] = useState(false);
  const {
    screen,
    selectedItem,
    selectItem,
    kimState,
    navigateScreen,
    setKimState,
    setKimMessage,
  } = useAppStore();

  const handleStart = () => {
    setIsStarted(true);
    setKimState('speaking');
    setKimMessage('Welcome! What a lovely day. What can I get for you today?');
    setTimeout(() => {
      setKimState('listening');
    }, 3000);
  };

  if (!isStarted) {
    return <KimIdle onStart={handleStart} />;
  }

  if (screen === 'payment') {
    return <PaymentScreen />;
  }

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen />;
      case 'coffee':
        return <CoffeeScreen />;
      case 'bakery':
        return <BakeryScreen />;
      case 'cake':
        return <CakeScreen />;
      case 'food':
        return <FoodScreen />;
      case 'cart':
        return <CartScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const showCategoryNav = ['coffee', 'bakery', 'cake', 'food'].includes(screen);
  const showKimMinimized = screen !== 'home';

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigateScreen('home')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors',
              screen === 'home'
                ? 'bg-primary-100 text-primary-600'
                : 'hover:bg-surface-100 text-surface-600'
            )}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Menu</span>
          </button>

          <h1 className="text-xl font-bold text-surface-800">Kim Cafe</h1>

          <button
            onClick={() => navigateScreen('cart')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors',
              screen === 'cart'
                ? 'bg-primary-100 text-primary-600'
                : 'hover:bg-surface-100 text-surface-600'
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-medium">Cart</span>
          </button>
        </div>

        {showCategoryNav && <CategoryNav />}
      </header>

      {!showKimMinimized && <KimActive />}

      <main className="pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {showKimMinimized && <KimActive isMinimized />}
      <CartFloating />

      <AnimatePresence>
        {selectedItem && (
          <ItemDetail item={selectedItem} onClose={() => selectItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
