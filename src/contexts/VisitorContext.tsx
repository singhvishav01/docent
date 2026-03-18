'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type VisitorType = 'guest' | 'registered' | null;

interface VisitorContextValue {
  visitorName: string | null;
  visitorType: VisitorType;
  isIdentified: boolean;
  docentName: string | null;
  setVisitorIdentity: (name: string, type: 'guest' | 'registered') => void;
  clearVisitorIdentity: () => void;
  setDocentName: (name: string) => void;
}

const VisitorContext = createContext<VisitorContextValue | null>(null);

const STORAGE_KEYS = {
  name: 'docent_visitor_name',
  type: 'docent_visitor_type',
  docentName: 'docent-chosen-name',
} as const;

export function VisitorProvider({ children }: { children: React.ReactNode }) {
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [visitorType, setVisitorType] = useState<VisitorType>(null);
  const [docentName, setDocentNameState] = useState<string | null>(null);

  // Rehydrate identity on mount:
  // 1. Check localStorage (guest or returning registered visitor)
  // 2. Fall back to checking JWT auth session (logged-in staff/visitor)
  useEffect(() => {
    let identified = false;
    try {
      const savedName = localStorage.getItem(STORAGE_KEYS.name);
      const savedType = localStorage.getItem(STORAGE_KEYS.type) as VisitorType;
      const savedDocentName = localStorage.getItem(STORAGE_KEYS.docentName);
      if (savedName && (savedType === 'guest' || savedType === 'registered')) {
        setVisitorName(savedName);
        setVisitorType(savedType);
        identified = true;
      }
      if (savedDocentName) {
        setDocentNameState(savedDocentName);
      }
    } catch {
      // localStorage unavailable
    }

    if (!identified) {
      // Check if the user is already logged in via the JWT auth system
      fetch('/api/auth/me')
        .then(r => (r.ok ? r.json() : null))
        .then(user => {
          if (user?.name || user?.email) {
            const name = (user.name || user.email.split('@')[0]) as string;
            setVisitorName(name);
            setVisitorType('registered');
            // Don't persist to localStorage — auth session handles persistence
          }
        })
        .catch(() => {});
    }
  }, []);

  const setVisitorIdentity = (name: string, type: 'guest' | 'registered') => {
    setVisitorName(name);
    setVisitorType(type);
    try {
      localStorage.setItem(STORAGE_KEYS.name, name);
      localStorage.setItem(STORAGE_KEYS.type, type);
    } catch {
      // Ignore storage errors
    }
  };

  const setDocentName = (name: string) => {
    setDocentNameState(name);
    try {
      localStorage.setItem(STORAGE_KEYS.docentName, name);
    } catch {
      // Ignore storage errors
    }
  };

  const clearVisitorIdentity = () => {
    setVisitorName(null);
    setVisitorType(null);
    setDocentNameState(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.name);
      localStorage.removeItem(STORAGE_KEYS.type);
      localStorage.removeItem(STORAGE_KEYS.docentName);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <VisitorContext.Provider
      value={{
        visitorName,
        visitorType,
        isIdentified: visitorName !== null,
        docentName,
        setVisitorIdentity,
        clearVisitorIdentity,
        setDocentName,
      }}
    >
      {children}
    </VisitorContext.Provider>
  );
}

export function useVisitor() {
  const ctx = useContext(VisitorContext);
  if (!ctx) throw new Error('useVisitor must be used inside VisitorProvider');
  return ctx;
}
