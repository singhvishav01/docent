'use client';

import { useVisitor } from '@/contexts/VisitorContext';
import { useVisitorGateStore } from '@/components/auth/VisitorGateModal';

/**
 * Returns a function that ensures the visitor is identified before proceeding.
 * If already identified, resolves immediately.
 * Otherwise, opens the gate modal and resolves when identity is set.
 */
export function useVisitorGate() {
  const { isIdentified } = useVisitor();
  const openGate = useVisitorGateStore(s => s.open);

  const requireIdentity = (): Promise<void> => {
    if (isIdentified) return Promise.resolve();

    return new Promise(resolve => {
      openGate(resolve);
    });
  };

  return { requireIdentity };
}
