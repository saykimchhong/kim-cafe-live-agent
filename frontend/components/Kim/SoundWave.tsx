'use client';

import { motion } from 'framer-motion';

export function SoundWave({ isActive }: { isActive: boolean }) {
  const bars = [0, 1, 2, 3, 4];
  
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {bars.map((index) => (
        <motion.div
          key={index}
          className="w-1 bg-primary-500 rounded-full"
          animate={
            isActive
              ? {
                  height: [8, 24, 12, 28, 8],
                  transition: {
                    duration: 0.8,
                    repeat: Infinity,
                    delay: index * 0.1,
                    ease: 'easeInOut',
                  },
                }
              : { height: 8 }
          }
          style={{ height: 8 }}
        />
      ))}
    </div>
  );
}
