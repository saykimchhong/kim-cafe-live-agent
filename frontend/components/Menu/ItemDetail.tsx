'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X, Check, Sparkles } from 'lucide-react';
import { MenuItem } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui';

interface ItemDetailProps {
  item: MenuItem;
  onClose: () => void;
}

export function ItemDetail({ item, onClose }: ItemDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomization, setSelectedCustomization] = useState<string | undefined>();
  const [isAdding, setIsAdding] = useState(false);
  const addToCart = useAppStore((s) => s.addToCart);
  const shouldShowAIBadge = useAppStore((s) => s.shouldShowAIBadge);
  const showBadge = shouldShowAIBadge(item.id);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart(item.id, quantity, selectedCustomization);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const incrementQuantity = () => setQuantity((q) => q + 1);
  const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative"
      >
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-green-500/90 z-20 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Check className="w-20 h-20 text-white" strokeWidth={3} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white text-xl font-bold mt-4"
              >
                Added to Cart!
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative aspect-video bg-surface-100 overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          
          <AnimatePresence>
            {showBadge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="absolute top-4 left-4 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                AI Selected
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10"
          >
            <X className="w-5 h-5 text-surface-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-surface-800">{item.name}</h2>
            <span className="text-2xl font-bold text-primary-600">{formatPrice(item.price)}</span>
          </div>

          <p className="text-surface-600 mb-6">{item.description}</p>

          {item.customizations.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-surface-700 mb-3">Customizations</h3>
              <div className="flex flex-wrap gap-2">
                {item.customizations.map((custom) => (
                  <button
                    key={custom}
                    onClick={() => setSelectedCustomization(
                      selectedCustomization === custom ? undefined : custom
                    )}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      selectedCustomization === custom
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    )}
                  >
                    {custom}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={decrementQuantity}
                className="p-2 rounded-full bg-surface-100 hover:bg-surface-200 transition-colors"
              >
                <Minus className="w-5 h-5 text-surface-600" />
              </button>
              <span className="text-xl font-semibold text-surface-800 w-8 text-center">
                {quantity}
              </span>
              <button
                onClick={incrementQuantity}
                className="p-2 rounded-full bg-surface-100 hover:bg-surface-200 transition-colors"
              >
                <Plus className="w-5 h-5 text-surface-600" />
              </button>
            </div>

            <Button size="lg" onClick={handleAddToCart}>
              Add {formatPrice(item.price * quantity)}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
