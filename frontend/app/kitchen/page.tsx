'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, Coffee, CheckCircle, RefreshCw } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type KitchenOrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

interface KitchenOrderItem {
  name: string;
  quantity: number;
  customization?: string;
  price?: number;
}

interface KitchenOrder {
  orderId: string;
  items: KitchenOrderItem[];
  customerAppearance: string;
  customerName: string;
  tableOrLocation: string;
  totalAmount: number;
  status: KitchenOrderStatus;
  createdAtMs: number;
}

interface RawKitchenOrder {
  orderId?: string;
  order_id?: string;
  items?: KitchenOrderItem[];
  customerAppearance?: string;
  customer_appearance?: string;
  customerName?: string;
  customer_name?: string;
  tableOrLocation?: string;
  table_or_location?: string;
  totalAmount?: number | string;
  total_amount?: number | string;
  status?: string;
  createdAt?: unknown;
  created_at?: unknown;
}

const isKitchenOrderStatus = (status: string): status is KitchenOrderStatus => {
  return status === 'pending' || status === 'preparing' || status === 'ready' || status === 'completed';
};

const parseTimestamp = (value: unknown): number => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value && typeof value === 'object') {
    const maybeFirestoreTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };

    if (typeof maybeFirestoreTimestamp.toDate === 'function') {
      return maybeFirestoreTimestamp.toDate().getTime();
    }

    if (typeof maybeFirestoreTimestamp.seconds === 'number') {
      const milliseconds = maybeFirestoreTimestamp.seconds * 1000;
      const nanos = typeof maybeFirestoreTimestamp.nanoseconds === 'number'
        ? Math.floor(maybeFirestoreTimestamp.nanoseconds / 1_000_000)
        : 0;
      return milliseconds + nanos;
    }
  }

  return 0;
};

const normalizeOrder = (rawOrder: RawKitchenOrder): KitchenOrder => {
  const items = Array.isArray(rawOrder.items) ? rawOrder.items : [];
  const status = typeof rawOrder.status === 'string' && isKitchenOrderStatus(rawOrder.status)
    ? rawOrder.status
    : 'pending';

  const totalAmountFromOrder = Number(rawOrder.totalAmount ?? rawOrder.total_amount);
  const fallbackTotal = items.reduce(
    (sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0),
    0
  );

  return {
    orderId: rawOrder.orderId ?? rawOrder.order_id ?? 'Unknown order',
    items,
    customerAppearance: rawOrder.customerAppearance ?? rawOrder.customer_appearance ?? '',
    customerName: rawOrder.customerName ?? rawOrder.customer_name ?? '',
    tableOrLocation: rawOrder.tableOrLocation ?? rawOrder.table_or_location ?? '',
    totalAmount: Number.isFinite(totalAmountFromOrder) ? totalAmountFromOrder : fallbackTotal,
    status,
    createdAtMs: parseTimestamp(rawOrder.createdAt ?? rawOrder.created_at),
  };
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/kitchen/orders`);
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        const activeOrders = data.orders
          .map((order: RawKitchenOrder) => normalizeOrder(order))
          .filter((order: KitchenOrder) => order.status !== 'completed')
          .sort((a: KitchenOrder, b: KitchenOrder) => b.createdAtMs - a.createdAtMs);
        setOrders(activeOrders);
      } else {
        setOrders([]);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    let interval = setInterval(fetchOrders, 3000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchOrders();
        interval = setInterval(fetchOrders, 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: KitchenOrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.orderId === orderId ? { ...order, status } : order
      )
    );

    try {
      await fetch(`${API_URL}/kitchen/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Failed to update order:', err);
      fetchOrders();
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    preparing: 'bg-blue-100 text-blue-700 border-blue-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="min-h-screen bg-surface-100 p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-800">Kitchen Dashboard</h1>
          <p className="text-surface-500 mt-1">
            Active orders from Kim Cafe Vision • Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="p-2 rounded-xl bg-white shadow hover:bg-surface-50 transition-colors"
        >
          <RefreshCw className={cn("w-5 h-5 text-surface-600", loading && "animate-spin")} />
        </button>
      </header>

      {loading && orders.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-surface-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-500">Loading orders...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {orders.map((order, index) => (
              <motion.div
                key={order.orderId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-md overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-surface-800">{order.orderId}</span>
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

                  {(order.customerName || order.customerAppearance) && (
                    <div className="flex items-center gap-2 text-surface-600 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">
                        {order.customerName && <strong>{order.customerName}</strong>}
                        {order.customerName && order.customerAppearance && ' - '}
                        {order.customerAppearance}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-surface-500 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{order.tableOrLocation || 'Counter'}</span>
                    <span className="mx-2">•</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                <div className="border-t border-surface-100 p-4 flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.orderId, 'preparing')}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.orderId, 'ready')}
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
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-16">
          <p className="text-surface-500 text-lg">No active orders</p>
          <p className="text-surface-400 text-sm mt-2">Orders will appear here when customers place them</p>
        </div>
      )}
    </div>
  );
}
