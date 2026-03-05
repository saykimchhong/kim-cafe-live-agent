'use client';

import { motion } from 'framer-motion';
import { KimAvatar } from './KimAvatar';

interface KimIdleProps {
  onStart: () => void;
}

export function KimIdle({ onStart }: KimIdleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-surface-50 to-surface-100"
    >
      <motion.div
        className="cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
      >
        <KimAvatar size="lg" isAnimated />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <h1 className="text-3xl font-bold text-surface-800 mb-2">
          Hi, I'm Kim!
        </h1>
        <motion.p
          className="text-surface-500 text-lg"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Tap to start ordering
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
