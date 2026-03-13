'use client';

import React from 'react';
import { SessionProvider } from '@/contexts/SessionProvider';
import { ArtworkProvider } from '@/contexts/ArtworkContext';
import { VisitorProvider } from '@/contexts/VisitorContext';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';
import { VisitorGateModal } from '@/components/auth/VisitorGateModal';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VisitorProvider>
        <ArtworkProvider>
          {children}
          <FloatingChatWidget />
          <VisitorGateModal />
        </ArtworkProvider>
      </VisitorProvider>
    </SessionProvider>
  );
}
