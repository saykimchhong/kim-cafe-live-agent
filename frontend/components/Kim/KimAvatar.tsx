'use client';

import { motion } from 'framer-motion';

interface KimAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  isAnimated?: boolean;
}

export function KimAvatar({ size = 'md', isAnimated = false }: KimAvatarProps) {
  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
  };

  const eyeSizes = {
    sm: { eye: 'w-2 h-3', gap: 'gap-3' },
    md: { eye: 'w-3 h-4', gap: 'gap-5' },
    lg: { eye: 'w-5 h-6', gap: 'gap-8' },
  };

  return (
    <motion.div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg`}
      animate={isAnimated ? { y: [0, -8, 0] } : {}}
      transition={isAnimated ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <div className={`flex ${eyeSizes[size].gap} items-center`}>
        <motion.div
          className={`${eyeSizes[size].eye} bg-white rounded-full`}
          animate={
            isAnimated
              ? { x: [-2, 2, -2], transition: { duration: 3, repeat: Infinity } }
              : {}
          }
        />
        <motion.div
          className={`${eyeSizes[size].eye} bg-white rounded-full`}
          animate={
            isAnimated
              ? { x: [-2, 2, -2], transition: { duration: 3, repeat: Infinity } }
              : {}
          }
        />
      </div>
    </motion.div>
  );
}
