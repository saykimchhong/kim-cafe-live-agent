'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, ShoppingCart, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { KimIdle, KimActive } from '@/components/Kim';
import { CategoryNav, ItemDetail } from '@/components/Menu';
import { CartFloating } from '@/components/Cart';
import { CustomerSoundWave } from '@/components/Camera';
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
import { useMediaStream } from '@/hooks';

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

  const {
    start: startMedia,
    setVideoElement,
    setCanvasElement,
    getFrequencyData,
    isActive: isMediaActive,
    error: mediaError,
  } = useMediaStream();

  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      setVideoElement(node);
    }
  }, [setVideoElement]);

  const canvasRefCallback = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      setCanvasElement(node);
    }
  }, [setCanvasElement]);

  const handleStart = async () => {
    setIsStarted(true);
    setTimeout(async () => {
      await startMedia();
      setKimState('speaking');
      setKimMessage('Welcome! What a lovely day. What can I get for you today?');
      setTimeout(() => {
        setKimState('listening');
      }, 3000);
    }, 100);
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

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed top-20 right-4 z-30"
      >
        <div className="relative rounded-2xl overflow-hidden shadow-lg bg-surface-900">
          <video
            ref={videoRefCallback}
            autoPlay
            playsInline
            muted
            className="w-32 h-32 object-cover"
          />
          <canvas ref={canvasRefCallback} className="hidden" />
          
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-full">
              {isMediaActive ? (
                <Video className="w-3 h-3 text-green-400" />
              ) : (
                <VideoOff className="w-3 h-3 text-red-400" />
              )}
              {isMediaActive ? (
                <Mic className="w-3 h-3 text-green-400" />
              ) : (
                <MicOff className="w-3 h-3 text-red-400" />
              )}
            </div>
            {mediaError && (
              <span className="text-xs text-red-400 bg-black/60 px-2 py-1 rounded-full">
                {mediaError}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 bg-surface-800 rounded-xl py-2">
          <CustomerSoundWave
            getFrequencyData={getFrequencyData}
            isActive={isMediaActive}
            barCount={16}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetail item={selectedItem} onClose={() => selectItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
