'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraPreviewProps {
  isActive: boolean;
  onVideoRef: (el: HTMLVideoElement | null) => void;
  onCanvasRef: (el: HTMLCanvasElement | null) => void;
  className?: string;
  showPreview?: boolean;
}

export function CameraPreview({
  isActive,
  onVideoRef,
  onCanvasRef,
  className,
  showPreview = true,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onVideoRef(videoRef.current);
    onCanvasRef(canvasRef.current);
  }, [onVideoRef, onCanvasRef]);

  return (
    <div className={cn('relative', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'rounded-xl object-cover',
          showPreview ? 'block' : 'absolute opacity-0 pointer-events-none'
        )}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {showPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50"
        >
          {isActive ? (
            <Video className="w-4 h-4 text-green-400" />
          ) : (
            <VideoOff className="w-4 h-4 text-red-400" />
          )}
        </motion.div>
      )}
    </div>
  );
}
