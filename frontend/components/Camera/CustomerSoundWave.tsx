'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface CustomerSoundWaveProps {
  getFrequencyData: () => Uint8Array | null;
  isActive: boolean;
  barCount?: number;
}

export function CustomerSoundWave({ getFrequencyData, isActive, barCount = 12 }: CustomerSoundWaveProps) {
  const [levels, setLevels] = useState<number[]>(Array(barCount).fill(0));
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setLevels(Array(barCount).fill(0));
      return;
    }

    const updateLevels = () => {
      const data = getFrequencyData();
      if (data) {
        const step = Math.floor(data.length / barCount);
        const newLevels = Array(barCount).fill(0).map((_, i) => {
          const start = i * step;
          const end = start + step;
          let sum = 0;
          for (let j = start; j < end; j++) {
            sum += data[j];
          }
          return (sum / step / 255) * 100;
        });
        setLevels(newLevels);
      }
      animationRef.current = requestAnimationFrame(updateLevels);
    };

    animationRef.current = requestAnimationFrame(updateLevels);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, barCount, getFrequencyData]);

  return (
    <div className="flex items-end justify-center gap-0.5 h-6 px-2">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-gradient-to-t from-primary-500 to-primary-300 rounded-full"
          animate={{ height: Math.max(4, level * 0.24) }}
          transition={{ duration: 0.05 }}
        />
      ))}
    </div>
  );
}
