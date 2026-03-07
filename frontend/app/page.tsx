'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, ShoppingCart, Video, Mic, MicOff, VideoOff, Wifi, WifiOff } from 'lucide-react';
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
import { useMediaStream, useAgentSocket } from '@/hooks';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export default function KioskPage() {
  const [isStarted, setIsStarted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true); 
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasSpeakingRef = useRef<boolean>(false);
  const waitingForResponseRef = useRef<boolean>(false); 
  const hasSpokenOnceRef = useRef<boolean>(false);
  
  const {
    screen,
    selectedItem,
    selectItem,
    kimState,
    navigateScreen,
    setKimState,
    setKimMessage,
    setSendMessage,
  } = useAppStore();

  // Callback when AI responds - reset waiting flag
  const handleAiResponse = useCallback(() => {
    waitingForResponseRef.current = false;
  }, []);

  const { sendMessage, isConnected } = useAgentSocket(WS_URL, handleAiResponse);

  // Set sendMessage in store so other components can use it
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
    isActive: isMediaActive,
    isSpeaking,
    error: mediaError,
  } = useMediaStream();

  // Send ALL audio data to backend for server-side VAD
  useEffect(() => {
    if (!isMediaActive) return;

    onAudioData((pcmData: Int16Array) => {
      const bytes = new Uint8Array(pcmData.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      sendMessage({ type: 'audio', data: btoa(binary) });
    });
    
    setVoiceThreshold(0.015);
  }, [isMediaActive, onAudioData, sendMessage, setVoiceThreshold]);

  // Server-side VAD handles turn detection automatically
  // No need for client-side silence detection - Gemini detects when user stops speaking

  // Send video frames at 1fps - only when videoEnabled
  useEffect(() => {
    if (!isMediaActive || !videoEnabled) {
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
  }, [isMediaActive, videoEnabled, captureFrame, sendMessage]);

  // Enable video during payment screen
  useEffect(() => {
    if (screen === 'payment') {
      setVideoEnabled(true);
    }
  }, [screen]);

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
    setVideoEnabled(true);
    setTimeout(async () => {
      await startMedia();
      setKimState('listening');
      // No initial text prompt - let AI greet naturally when customer speaks
      // Video frames will be sent for first 3s for appearance recognition
      
      // Disable video after 3 seconds (customer appearance captured)
      videoTimeoutRef.current = setTimeout(() => {
        setVideoEnabled(false);
      }, 3000);
    }, 100);
  };

  const handleEndSession = () => {
    sendMessage({ type: 'end_session' });
    stopMedia();
    setIsStarted(false);
    setVideoEnabled(false);
    // Reset all refs for fresh session
    wasSpeakingRef.current = false;
    waitingForResponseRef.current = false;
    hasSpokenOnceRef.current = false;
    if (videoTimeoutRef.current) {
      clearTimeout(videoTimeoutRef.current);
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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
        {/* Video capture - hidden from user but still capturing frames for AI */}
        <video
          ref={videoRefCallback}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        <canvas ref={canvasRefCallback} className="hidden" />
        
        {/* Status indicators and audio visualization */}
        <div className="rounded-2xl overflow-hidden shadow-lg bg-surface-900 p-3">
          <div className="flex items-center gap-2 mb-2">
            {isMediaActive ? (
              <Video className="w-4 h-4 text-green-400" />
            ) : (
              <VideoOff className="w-4 h-4 text-red-400" />
            )}
            {isMediaActive ? (
              <Mic className={cn(
                "w-4 h-4 transition-colors",
                isSpeaking ? "text-blue-400 animate-pulse" : "text-green-400"
              )} />
            ) : (
              <MicOff className="w-4 h-4 text-red-400" />
            )}
            {isSpeaking && (
              <span className="text-xs text-blue-400 font-medium animate-pulse">
                Listening...
              </span>
            )}
            {mediaError && (
              <span className="text-xs text-red-400">
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
        <button
          onClick={handleEndSession}
          className="mt-2 w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          End Session
        </button>
      </motion.div>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetail item={selectedItem} onClose={() => selectItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
