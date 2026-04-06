'use client';

import { useEffect } from 'react';

/**
 * iOS blocks audio playback until a user gesture has occurred.
 * This component silently unlocks HTMLAudioElement + AudioContext
 * on the very first tap anywhere in the app.
 *
 * Must be rendered inside the app root (already in ClientProviders).
 */
export function IOSAudioUnlock() {
  useEffect(() => {
    let unlocked = false;

    function unlock() {
      if (unlocked) return;
      unlocked = true;

      // Unlock AudioContext (needed for Web Audio API / Deepgram pre-filter)
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          // Close idle context to save battery
          setTimeout(() => ctx.close().catch(() => {}), 500);
        }
      } catch { /* not available */ }

      // Unlock HTMLAudioElement (needed for TTS playback)
      const silent = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      );
      silent.play().catch(() => {});

      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('click', unlock, true);
    }

    document.addEventListener('touchstart', unlock, { once: true, capture: true });
    document.addEventListener('click', unlock, { once: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('click', unlock, true);
    };
  }, []);

  return null;
}
