'use client';

import React from 'react';
import { SessionProvider } from '@/contexts/SessionProvider';
import { ArtworkProvider } from '@/contexts/ArtworkContext';
import { VisitorProvider } from '@/contexts/VisitorContext';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';
import { VisitorGateModal } from '@/components/auth/VisitorGateModal';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { IOSAudioUnlock } from '@/components/pwa/IOSAudioUnlock';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VisitorProvider>
        <ArtworkProvider>
          {children}
          <FloatingChatWidget />
          <VisitorGateModal />
          <ServiceWorkerRegistration />
          <IOSAudioUnlock />
        </ArtworkProvider>
      </VisitorProvider>
    </SessionProvider>
  );
}
