'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ScreenName, KimState } from '@/lib/types';

interface AgentMessage {
  action: string;
  payload: unknown;
}

export function useAgentSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const {
    navigateScreen,
    addToCart,
    removeFromCart,
    highlightItem,
    selectItem,
    setKimState,
    setKimMessage,
    showPaymentQR,
  } = useAppStore();

  const connect = useCallback(() => {
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const message: AgentMessage = JSON.parse(event.data);
        handleAgentAction(message);
      } catch {
        return;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  const handleAgentAction = useCallback((message: AgentMessage) => {
    const { action, payload } = message;

    switch (action) {
      case 'navigate_screen':
        navigateScreen(payload as ScreenName);
        break;

      case 'add_to_cart': {
        const { itemId, quantity, customization } = payload as {
          itemId: string;
          quantity: number;
          customization?: string;
        };
        addToCart(itemId, quantity, customization);
        break;
      }

      case 'remove_from_cart':
        removeFromCart(payload as string);
        break;

      case 'highlight_item':
        highlightItem(payload as string | null);
        break;

      case 'select_item':
        const { getMenuItemById } = require('@/lib/mockData');
        const item = getMenuItemById(payload as string);
        if (item) selectItem(item);
        break;

      case 'close_detail':
        selectItem(null);
        break;

      case 'kim_state':
        setKimState(payload as KimState);
        break;

      case 'kim_speak':
        setKimMessage(payload as string);
        setKimState('speaking');
        break;

      case 'show_payment':
        showPaymentQR(payload as number);
        break;

      default:
        break;
    }
  }, [
    navigateScreen,
    addToCart,
    removeFromCart,
    highlightItem,
    selectItem,
    setKimState,
    setKimMessage,
    showPaymentQR,
  ]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
