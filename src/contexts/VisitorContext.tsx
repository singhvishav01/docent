'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { VisitorProfile } from '@/lib/acquaintance/profile';

type VisitorType = 'guest' | 'registered' | null;

interface VisitorContextValue {
  visitorName: string | null;
  visitorType: VisitorType;
  isIdentified: boolean;
  isProfileLoading: boolean;  // true while auth + DB profile are being fetched on mount
  docentName: string | null;
  visitorProfile: VisitorProfile | null;
  setVisitorIdentity: (name: string, type: 'guest' | 'registered') => void;
  clearVisitorIdentity: () => void;
  clearVisitorProfile: () => void;
  setDocentName: (name: string) => void;
  setVisitorProfile: (profile: VisitorProfile) => void;
  updateVisitorProfile: (patch: Partial<VisitorProfile>) => void;
}

const VisitorContext = createContext<VisitorContextValue | null>(null);

const STORAGE_KEYS = {
  name: 'docent_visitor_name',
  type: 'docent_visitor_type',
  docentName: 'docent-chosen-name',
  profile: 'docent_visitor_profile',
} as const;

// How long to wait after the last update before flushing to DB (ms)
const DB_DEBOUNCE_MS = 30_000;

export function VisitorProvider({ children }: { children: React.ReactNode }) {
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [visitorType, setVisitorType] = useState<VisitorType>(null);
  const [docentName, setDocentNameState] = useState<string | null>(null);
  const [visitorProfile, setVisitorProfileState] = useState<VisitorProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Tracks whether the current user is authenticated (has a valid JWT session)
  const isRegisteredRef = useRef(false);
  const docentNameRef = useRef<string | null>(null);
  const dbFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProfileRef = useRef<VisitorProfile | null>(null);

  // ── DB sync helpers ──────────────────────────────────────────────────────────

  const flushProfileToDB = useCallback((profile: VisitorProfile, docent: string | null) => {
    if (!isRegisteredRef.current) return;
    fetch('/api/profile/personality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, docentName: docent }),
    }).catch(err => console.error('[VisitorContext] DB flush error:', err));
  }, []);

  const scheduleDBFlush = useCallback((profile: VisitorProfile) => {
    if (!isRegisteredRef.current) return;
    pendingProfileRef.current = profile;
    if (dbFlushTimerRef.current) clearTimeout(dbFlushTimerRef.current);
    dbFlushTimerRef.current = setTimeout(() => {
      if (pendingProfileRef.current) {
        flushProfileToDB(pendingProfileRef.current, docentNameRef.current);
        pendingProfileRef.current = null;
      }
    }, DB_DEBOUNCE_MS);
  }, [flushProfileToDB]);

  // Flush immediately on tab close / navigation away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingProfileRef.current && isRegisteredRef.current) {
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon(
          '/api/profile/personality',
          new Blob(
            [JSON.stringify({ profile: pendingProfileRef.current, docentName: docentNameRef.current })],
            { type: 'application/json' }
          )
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── On mount: rehydrate identity ─────────────────────────────────────────────
  // Priority order:
  //   1. localStorage (fastest, works offline)
  //   2. JWT auth session → then pull profile from DB (overrides localStorage)

  useEffect(() => {
    let identifiedFromStorage = false;

    try {
      const savedName = localStorage.getItem(STORAGE_KEYS.name);
      const savedType = localStorage.getItem(STORAGE_KEYS.type) as VisitorType;
      const savedDocentName = localStorage.getItem(STORAGE_KEYS.docentName);
      const savedProfile = localStorage.getItem(STORAGE_KEYS.profile);

      if (savedName && (savedType === 'guest' || savedType === 'registered')) {
        setVisitorName(savedName);
        setVisitorType(savedType);
        identifiedFromStorage = true;
        if (savedType === 'registered') isRegisteredRef.current = true;
      }
      if (savedDocentName) {
        setDocentNameState(savedDocentName);
        docentNameRef.current = savedDocentName;
      }
      if (savedProfile) {
        setVisitorProfileState(JSON.parse(savedProfile));
      }
    } catch {
      // localStorage unavailable
    }

    // Always check JWT session — if logged in, pull fresh profile from DB
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(async user => {
        if (!user?.id) {
          // Not logged in — loading is complete, rely on localStorage
          setIsProfileLoading(false);
          return;
        }

        const name = (user.name || user.email.split('@')[0]) as string;
        setVisitorName(name);
        setVisitorType('registered');
        isRegisteredRef.current = true;

        if (!identifiedFromStorage) {
          try {
            localStorage.setItem(STORAGE_KEYS.name, name);
            localStorage.setItem(STORAGE_KEYS.type, 'registered');
          } catch { /* ignore */ }
        }

        // Pull personality from DB — this is the source of truth for registered users
        try {
          const res = await fetch('/api/profile/personality');
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              // DB profile wins over localStorage for registered users
              setVisitorProfileState(data.profile as VisitorProfile);
              try {
                localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(data.profile));
              } catch { /* ignore */ }
            }
            if (data.docentName) {
              setDocentNameState(data.docentName);
              docentNameRef.current = data.docentName;
              try {
                localStorage.setItem(STORAGE_KEYS.docentName, data.docentName);
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore — fall back to localStorage profile */ }

        setIsProfileLoading(false);
      })
      .catch(() => { setIsProfileLoading(false); });
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────────

  const setVisitorIdentity = (name: string, type: 'guest' | 'registered') => {
    setVisitorName(name);
    setVisitorType(type);
    if (type === 'registered') isRegisteredRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEYS.name, name);
      localStorage.setItem(STORAGE_KEYS.type, type);
    } catch { /* ignore */ }
  };

  const setDocentName = (name: string) => {
    setDocentNameState(name);
    docentNameRef.current = name;
    try {
      localStorage.setItem(STORAGE_KEYS.docentName, name);
    } catch { /* ignore */ }
  };

  const setVisitorProfile = (profile: VisitorProfile) => {
    setVisitorProfileState(profile);
    try {
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch { /* ignore */ }
    // Immediately flush to DB — this is called at end of onboarding (high value moment)
    if (isRegisteredRef.current) {
      flushProfileToDB(profile, docentNameRef.current);
    }
  };

  const updateVisitorProfile = useCallback((patch: Partial<VisitorProfile>) => {
    setVisitorProfileState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updated));
      } catch { /* ignore */ }
      // Debounced DB write — don't hammer the DB on every message
      scheduleDBFlush(updated);
      return updated;
    });
  }, [scheduleDBFlush]);

  const clearVisitorProfile = () => {
    setVisitorProfileState(null);
    setDocentNameState(null);
    docentNameRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.profile);
      localStorage.removeItem(STORAGE_KEYS.docentName);
    } catch { /* ignore */ }
  };

  const clearVisitorIdentity = () => {
    if (dbFlushTimerRef.current) clearTimeout(dbFlushTimerRef.current);
    setVisitorName(null);
    setVisitorType(null);
    setDocentNameState(null);
    setVisitorProfileState(null);
    isRegisteredRef.current = false;
    docentNameRef.current = null;
    pendingProfileRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.name);
      localStorage.removeItem(STORAGE_KEYS.type);
      localStorage.removeItem(STORAGE_KEYS.docentName);
      localStorage.removeItem(STORAGE_KEYS.profile);
    } catch { /* ignore */ }
  };

  return (
    <VisitorContext.Provider
      value={{
        visitorName,
        visitorType,
        isIdentified: visitorName !== null,
        isProfileLoading,
        docentName,
        visitorProfile,
        setVisitorIdentity,
        clearVisitorIdentity,
        clearVisitorProfile,
        setDocentName,
        setVisitorProfile,
        updateVisitorProfile,
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
