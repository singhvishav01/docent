'use client';

import { useEffect, useState } from 'react';

interface PWAState {
  /** True when the app is running as an installed PWA (no browser chrome) */
  isStandalone: boolean;
  /** True once the browser fires the native install prompt (Android/Chrome) */
  canInstall: boolean;
  /** Call this to trigger the native install prompt */
  promptInstall: () => Promise<void>;
}

export function usePWA(): PWAState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Standalone = launched from home screen (iOS or Android PWA)
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Android/Chrome fires this when the app is installable
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return {
    isStandalone,
    canInstall: !!deferredPrompt,
    promptInstall,
  };
}
