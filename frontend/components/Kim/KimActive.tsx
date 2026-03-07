'use client';

import { motion } from 'framer-motion';
import { KimAvatar } from './KimAvatar';
import { SoundWave } from './SoundWave';
import { useAppStore } from '@/stores/useAppStore';

interface KimActiveProps {
  isMinimized?: boolean;
}

export function KimActive({ isMinimized = false }: KimActiveProps) {
  const { kimState, kimMessage } = useAppStore();
  const isSpeaking = kimState === 'speaking';

  if (isMinimized) {
    // Only show when AI is actively responding
    if (kimState === 'idle' || kimState === 'listening') {
      return null;
    }
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 20 }}
        className="fixed top-20 right-6 z-30 flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3"
      >
        <KimAvatar size="sm" />
        <SoundWave isActive={isSpeaking} />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-8"
    >
      <KimAvatar size="md" />
      
      <div className="mt-4 flex items-center gap-3">
        <SoundWave isActive={isSpeaking} />
      </div>

      {kimMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 max-w-md text-center"
        >
          <p className="text-surface-700 text-lg">{kimMessage}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
