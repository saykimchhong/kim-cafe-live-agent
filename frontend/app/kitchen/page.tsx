'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, Coffee, CheckCircle } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

interface KitchenOrder {
  id: string;
  items: Array<{
    name: string;
    quantity: number;
    customization?: string;
  }>;
  customerDescription: string;
  tableNumber: number;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready';
  createdAt: Date;
}

const mockOrders: KitchenOrder[] = [
  {
    id: 'ORD-001',
    items: [
      { name: 'Caffè Latte', quantity: 2, customization: 'Oat Milk' },
      { name: 'Croissant', quantity: 1 },
    ],
    customerDescription: 'Woman in red scarf',
    tableNumber: 4,
    totalAmount: 12.25,
    status: 'pending',
    createdAt: new Date(),
  },
  {
    id: 'ORD-002',
    items: [
      { name: 'Americano', quantity: 1 },
      { name: 'Tiramisu', quantity: 1 },
    ],
    customerDescription: 'Man with glasses, blue jacket',
    tableNumber: 7,
    totalAmount: 10.75,
    status: 'preparing',
    createdAt: new Date(Date.now() - 300000),
  },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>(mockOrders);

  const updateOrderStatus = (orderId: string, status: KitchenOrder['status']) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    preparing: 'bg-blue-100 text-blue-700 border-blue-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="min-h-screen bg-surface-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-surface-800">Kitchen Dashboard</h1>
        <p className="text-surface-500 mt-1">Active orders from Kim Cafe Vision</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-md overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-surface-800">{order.id}</span>
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium border',
                      statusColors[order.status]
                    )}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Coffee className="w-4 h-4 text-primary-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-surface-700">
                          {item.quantity}x {item.name}
                        </span>
                        {item.customization && (
                          <p className="text-sm text-surface-500">{item.customization}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-surface-600 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{order.customerDescription}</span>
                </div>

                <div className="flex items-center gap-2 text-surface-500 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Table {order.tableNumber}</span>
                  <span className="mx-2">•</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              <div className="border-t border-surface-100 p-4 flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="flex-1 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <div className="flex-1 py-2 text-center text-green-600 font-medium">
                    Ready for pickup
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-16">
          <p className="text-surface-500 text-lg">No active orders</p>
        </div>
      )}
    </div>
  );
}
