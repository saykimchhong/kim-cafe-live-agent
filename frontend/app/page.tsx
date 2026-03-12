'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, ShoppingCart, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { KimIdle, KimActive } from '@/components/Kim';
import { CategoryNav, ItemDetail } from '@/components/Menu';
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
import { useMediaStream, useAgentSocket } from '@/hooks';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export default function KioskPage() {
  const [isStarted, setIsStarted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true); 
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [barCount, setBarCount] = useState(32);
  const [inkBlobs, setInkBlobs] = useState([
    { x: 30, y: 80, size: 200, opacity: 0.3 },
    { x: 70, y: 70, size: 250, opacity: 0.2 },
    { x: 50, y: 85, size: 180, opacity: 0.25 },
  ]);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeAnimationRef = useRef<number>(0);
  const blobUpdateRef = useRef<number>(0);
  
  const {
    screen,
    selectedItem,
    selectItem,
    kimState,
    navigateScreen,
    setKimState,
    setKimMessage,
    setSendMessage,
    cart,
  } = useAppStore();

  const kimStateRef = useRef(kimState);
  useEffect(() => { kimStateRef.current = kimState; }, [kimState]);

  const { sendMessage, isConnected, initAudio } = useAgentSocket(isStarted ? WS_URL : undefined);

  useEffect(() => {
    if (sendMessage) {
      setSendMessage(sendMessage);
    }
  }, [sendMessage, setSendMessage]);

  const {
    start: startMedia,
    stop: stopMedia,
    setVideoElement,
    setCanvasElement,
    getFrequencyData,
    captureFrame,
    onAudioData,
    setVoiceThreshold,
    stopVideo,
    isActive: isMediaActive,
    isSpeaking,
    error: mediaError,
  } = useMediaStream();

  const handleAudioData = useCallback((pcmData: Int16Array) => {
    if (kimStateRef.current !== 'listening') return;
    const uint8 = new Uint8Array(pcmData.buffer);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...Array.from(uint8.subarray(i, i + CHUNK)));
    }
    sendMessage({ type: 'audio', data: btoa(binary) });
  }, [sendMessage]);

  useEffect(() => {
    if (!isMediaActive) {
      setVoiceVolume(0);
      return;
    }

    let lastUpdate = 0;
    const updateVolume = (timestamp: number) => {
      if (timestamp - lastUpdate >= 50) {
        lastUpdate = timestamp;
        const data = getFrequencyData();
        if (data) {
          const sum = data.reduce((acc, val) => acc + val, 0);
          const average = sum / data.length / 255;
          setVoiceVolume(average);
        }
      }
      volumeAnimationRef.current = requestAnimationFrame(updateVolume);
    };

    volumeAnimationRef.current = requestAnimationFrame(updateVolume);

    return () => {
      cancelAnimationFrame(volumeAnimationRef.current);
    };
  }, [isMediaActive, getFrequencyData]);

  useEffect(() => {
    const updateBarCount = () => {
      const width = window.innerWidth;
      if (width >= 1280) {
        setBarCount(64);
      } else if (width >= 1024) {
        setBarCount(48);
      } else if (width >= 768) {
        setBarCount(40);
      } else {
        setBarCount(32);
      }
    };

    updateBarCount();
    window.addEventListener('resize', updateBarCount);

    return () => window.removeEventListener('resize', updateBarCount);
  }, []);

  useEffect(() => {
    if (!isMediaActive) {
      return;
    }

    let lastUpdate = 0;
    const updateBlobs = (timestamp: number) => {
      if (timestamp - lastUpdate >= 50) {
        lastUpdate = timestamp;
        if (voiceVolume > 0.15) {
          setInkBlobs(prev => prev.map(blob => ({
            x: Math.max(10, Math.min(90, blob.x + (Math.random() - 0.5) * voiceVolume * 15)),
            y: Math.max(60, Math.min(95, blob.y + (Math.random() - 0.5) * voiceVolume * 10)),
            size: 150 + Math.random() * 150 * (1 + voiceVolume),
            opacity: 0.2 + voiceVolume * 0.5,
          })));
        } else {
          setInkBlobs(prev => prev.map((blob, i) => {
            const restPositions = [
              { x: 30, y: 80 },
              { x: 70, y: 70 },
              { x: 50, y: 85 },
            ];
            return {
              x: blob.x + (restPositions[i].x - blob.x) * 0.05,
              y: blob.y + (restPositions[i].y - blob.y) * 0.05,
              size: blob.size + (200 - blob.size) * 0.05,
              opacity: blob.opacity + (0.2 - blob.opacity) * 0.05,
            };
          }));
        }
      }
      blobUpdateRef.current = requestAnimationFrame(updateBlobs);
    };

    blobUpdateRef.current = requestAnimationFrame(updateBlobs);

    return () => {
      cancelAnimationFrame(blobUpdateRef.current);
    };
  }, [isMediaActive, voiceVolume]);

  useEffect(() => {
    if (!isMediaActive) return;
    onAudioData(handleAudioData);
    setVoiceThreshold(0.015);
  }, [isMediaActive, onAudioData, handleAudioData, setVoiceThreshold]);

  useEffect(() => {
    const skipScreens = ['payment', 'cart'];
    if (!isMediaActive || !videoEnabled || skipScreens.includes(screen)) {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      return;
    }

    frameIntervalRef.current = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        sendMessage({ type: 'video', data: frame });
      }
    }, 1000);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isMediaActive, videoEnabled, screen, captureFrame, sendMessage]);

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
    initAudio();
    setIsStarted(true);
    await startMedia();
    videoTimeoutRef.current = setTimeout(() => {
      setVideoEnabled(false);
      stopVideo();
    }, 1500);
  };

  const handleEndSession = () => {
    sendMessage({ type: 'end_session' });
    stopMedia();
    setIsStarted(false);
    setVideoEnabled(false);
    if (videoTimeoutRef.current) {
      clearTimeout(videoTimeoutRef.current);
    }
    navigateScreen('home');
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
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200">
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

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-surface-800">Lumina Cafe</h1>
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>

          <button
            onClick={() => navigateScreen('cart')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors relative',
              screen === 'cart'
                ? 'bg-primary-100 text-primary-600'
                : 'hover:bg-surface-100 text-surface-600'
            )}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
            <span className="font-medium">Cart</span>
          </button>
        </div>

        {showCategoryNav && <CategoryNav />}
      </header>

      {!showKimMinimized && <KimActive />}

      <main className="pb-28">
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

      </div>
      {showKimMinimized && <KimActive isMinimized />}

      <video
        ref={videoRefCallback}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
      <canvas ref={canvasRefCallback} className="hidden" />

      <div className="fixed bottom-0 left-0 right-0 h-40 z-0 overflow-hidden pointer-events-none">
        {inkBlobs.map((blob, i) => (
          <motion.div
            key={i}
            className="absolute"
            animate={{
              left: `${blob.x}%`,
              bottom: `${100 - blob.y}%`,
              width: `${blob.size}px`,
              height: `${blob.size}px`,
              opacity: blob.opacity,
            }}
            transition={{ 
              duration: 0.6,
              ease: 'easeOut',
            }}
            style={{
              background: `radial-gradient(circle, rgba(249, 115, 22, ${0.6 + voiceVolume * 0.4}) 0%, rgba(251, 146, 60, ${0.4 + voiceVolume * 0.3}) 30%, transparent 70%)`,
              filter: 'blur(20px)',
              transform: 'translate(-50%, 50%)',
            }}
          />
        ))}
        
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, rgba(249, 115, 22, ${0.3 + voiceVolume * 0.4}), transparent 60%)`,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-30"
      >
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <div className="w-full md:w-auto md:flex-1 md:max-w-md">
              <CustomerSoundWave
                getFrequencyData={getFrequencyData}
                isActive={isMediaActive}
                barCount={barCount}
              />
            </div>
            
            {/* End session button */}
            <button
              onClick={handleEndSession}
              className="px-6 py-2 bg-red-500/90 hover:bg-red-600 text-white text-sm font-medium rounded-full transition-all hover:scale-105 shadow-lg whitespace-nowrap"
            >
              End Session
            </button>
          </div>
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
