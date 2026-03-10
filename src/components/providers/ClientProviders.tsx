'use client';

import React from 'react';
import { SessionProvider } from '@/contexts/SessionProvider';
import { ArtworkProvider } from '@/contexts/ArtworkContext';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ArtworkProvider>
        {children}
        <FloatingChatWidget />
      </ArtworkProvider>
    </SessionProvider>
  );
}
