'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface MediaStreamConfig {
  video?: {
    width?: number;
    height?: number;
    facingMode?: 'user' | 'environment';
  };
  audio?: {
    sampleRate?: number;
    channelCount?: number;
  };
}

const defaultConfig: MediaStreamConfig = {
  video: {
    width: 768,
    height: 768,
    facingMode: 'user',
  },
  audio: {
    sampleRate: 16000,
    channelCount: 1,
  },
};

export function useMediaStream(config: MediaStreamConfig = defaultConfig) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAudioDataRef = useRef<((data: Int16Array) => void) | null>(null);

  const start = useCallback(async () => {
    try {
      const videoConfig = config.video || defaultConfig.video!;
      const audioConfig = config.audio || defaultConfig.audio!;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: videoConfig.width },
          height: { ideal: videoConfig.height },
          facingMode: videoConfig.facingMode,
        },
        audio: {
          sampleRate: { ideal: audioConfig.sampleRate },
          channelCount: { exact: audioConfig.channelCount },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const audioContext = new AudioContext({ sampleRate: audioConfig.sampleRate });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if (onAudioDataRef.current) {
          onAudioDataRef.current(pcm16);
        }
      };

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      processorRef.current = processor;

      setIsActive(true);
      setError(null);
    } catch (err) {
      setError('Media access denied');
      setIsActive(false);
    }
  }, [config]);

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isActive) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const videoConfig = config.video || defaultConfig.video!;

    if (!ctx) return null;

    canvas.width = videoConfig.width!;
    canvas.height = videoConfig.height!;

    ctx.drawImage(video, 0, 0, videoConfig.width!, videoConfig.height!);

    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  }, [isActive, config.video]);

  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  const onAudioData = useCallback((callback: (data: Int16Array) => void) => {
    onAudioDataRef.current = callback;
  }, []);

  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  const setCanvasElement = useCallback((element: HTMLCanvasElement | null) => {
    canvasRef.current = element;
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    captureFrame,
    getFrequencyData,
    onAudioData,
    setVideoElement,
    setCanvasElement,
    isActive,
    error,
  };
}
