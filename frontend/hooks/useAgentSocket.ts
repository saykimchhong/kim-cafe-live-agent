'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ScreenName, KimState } from '@/lib/types';
import { getMenuItemById } from '@/lib/websiteData';

interface AgentMessage {
  action: string;
  payload: unknown;
}

export function useAgentSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const cleanupRef = useRef(false);
  const connectingRef = useRef(false);

  // Play queued audio chunks
  const playNextChunk = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const samples = audioQueueRef.current.shift()!;

    // Let the browser resample automatically: create an AudioBuffer with the
    // source sample rate (24kHz) and let the AudioContext handle resampling.
    const ctx = audioContextRef.current!;
    const sourceSampleRate = 24000;

    const audioBuffer = ctx.createBuffer(1, samples.length, sourceSampleRate);
    const channelData = audioBuffer.getChannelData(0);
    channelData.set(samples);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      setTimeout(playNextChunk, 0);
    };
    source.start();
  }, []);

  // Convert base64 PCM to Float32Array and queue for playback
  const playAudio = useCallback((base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const validLen = len - (len % 2);
      const numSamples = validLen / 2;
      const float32Array = new Float32Array(numSamples);
      
      for (let i = 0; i < numSamples; i++) {
        const low = bytes[i * 2];
        const high = bytes[i * 2 + 1];
        let sample = (high << 8) | low;
        if (sample >= 32768) sample -= 65536;
        float32Array[i] = sample / 32768;
      }
      
      audioQueueRef.current.push(float32Array);
      if (!isPlayingRef.current) {
        playNextChunk();
      }
    } catch (err) {
      console.error('Audio error:', err);
    }
  }, [playNextChunk]);

  const handleAgentAction = useCallback((message: AgentMessage) => {
    const { action, payload } = message;
    // Get fresh store on each action - ensures we always have latest methods
    const store = useAppStore.getState();

    switch (action) {
      case 'ack':
        return;

      case 'session_started':
        break;

      case 'navigate_screen':
        store.navigateScreen(payload as ScreenName);
        break;

      case 'add_to_cart': {
        const { itemId, quantity, customization } = payload as {
          itemId: string;
          quantity: number;
          customization?: string;
        };
        store.addToCart(itemId, quantity, customization);
        setTimeout(() => useAppStore.getState().selectItem(null), 800);
        break;
      }

      case 'remove_from_cart':
        store.removeFromCart(payload as string);
        break;

      case 'highlight_item':
        store.highlightItem(payload as string | null);
        break;

      case 'select_item':
        const item = getMenuItemById(payload as string);
        if (item) store.selectItem(item);
        break;

      case 'close_detail':
        store.selectItem(null);
        break;

      case 'kim_state':
        store.setKimState(payload as KimState);
        break;

      case 'kim_speak':
        break;

      case 'kim_audio':
        store.setKimState('speaking');
        playAudio(payload as string);
        break;

      case 'show_payment':
        store.showPaymentQR(payload as number);
        break;

      case 'order_submitted':
        break;

      case 'session_warning':
        store.setKimMessage(payload as string || "Still there?");
        break;

      case 'session_timeout':
      case 'session_ended':
        break;

      case 'error':
        console.error('Backend error:', payload);
        break;

      default:
        break;
    }
  }, [playAudio]);

  // Use ref to avoid reconnection when handler changes
  const handleAgentActionRef = useRef(handleAgentAction);
  handleAgentActionRef.current = handleAgentAction;

  const connect = useCallback(() => {
    if (!url) return;
    
    // Prevent double connections and connections after cleanup
    if (cleanupRef.current || connectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    connectingRef.current = true;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (cleanupRef.current) {
        ws.close();
        return;
      }
      wsRef.current = ws;
      connectingRef.current = false;
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: AgentMessage = JSON.parse(event.data);
        handleAgentActionRef.current(message);
      } catch (err) {
        console.error('[WS] Error:', err);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      connectingRef.current = false;
      setIsConnected(false);
      // Only reconnect if not cleaned up
      if (!cleanupRef.current) {
        setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);  // Only depends on url now

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    cleanupRef.current = false;  // Reset on mount
    connect();
    return () => {
      cleanupRef.current = true;  // Mark as cleaned up
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [connect]);

  return {
    sendMessage,
    isConnected,
  };
}
