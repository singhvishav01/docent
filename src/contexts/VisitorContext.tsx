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

// Registered users: localStorage (persists across sessions — they have accounts)
const LS_KEYS = {
  name: 'docent_visitor_name',
  type: 'docent_visitor_type',
  docentName: 'docent-chosen-name',
  profile: 'docent_visitor_profile',
} as const;

// Guests: sessionStorage (cleared when the tab/browser closes — guests are ephemeral)
const SS_KEYS = {
  name: 'docent_guest_name',
  docentName: 'docent_guest_docent_name',
  profile: 'docent_guest_profile',
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
  //   1. Registered users: rehydrate from localStorage (persists across sessions)
  //   2. Guests: rehydrate from sessionStorage ONLY (ephemeral — clears on tab close)
  //      Any old guest data sitting in localStorage is cleaned up here.
  //   3. JWT auth session → pull fresh profile from DB (overrides localStorage)

  useEffect(() => {
    let identifiedFromStorage = false;

    try {
      const savedType = localStorage.getItem(LS_KEYS.type) as VisitorType;

      if (savedType === 'registered') {
        // Registered user — restore from localStorage
        const savedName = localStorage.getItem(LS_KEYS.name);
        const savedDocentName = localStorage.getItem(LS_KEYS.docentName);
        const savedProfile = localStorage.getItem(LS_KEYS.profile);

        if (savedName) {
          setVisitorName(savedName);
          setVisitorType('registered');
          isRegisteredRef.current = true;
          identifiedFromStorage = true;
        }
        if (savedDocentName) {
          setDocentNameState(savedDocentName);
          docentNameRef.current = savedDocentName;
        }
        if (savedProfile) {
          setVisitorProfileState(JSON.parse(savedProfile));
        }
      } else if (savedType === 'guest') {
        // Old guest data sitting in localStorage — clean it up.
        // Guests never persist across sessions.
        localStorage.removeItem(LS_KEYS.name);
        localStorage.removeItem(LS_KEYS.type);
        localStorage.removeItem(LS_KEYS.docentName);
        localStorage.removeItem(LS_KEYS.profile);
      }
    } catch {
      // localStorage unavailable
    }

    // Restore guest session data from sessionStorage (same-tab navigation only)
    if (!identifiedFromStorage) {
      try {
        const sessionName = sessionStorage.getItem(SS_KEYS.name);
        const sessionDocentName = sessionStorage.getItem(SS_KEYS.docentName);
        const sessionProfile = sessionStorage.getItem(SS_KEYS.profile);

        if (sessionName) {
          setVisitorName(sessionName);
          setVisitorType('guest');
          identifiedFromStorage = true;
        }
        if (sessionDocentName) {
          setDocentNameState(sessionDocentName);
          docentNameRef.current = sessionDocentName;
        }
        if (sessionProfile) {
          setVisitorProfileState(JSON.parse(sessionProfile));
        }
      } catch {
        // sessionStorage unavailable
      }
    }

    // Always check JWT session — if logged in, pull fresh profile from DB
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(async user => {
        if (!user?.id) {
          setIsProfileLoading(false);
          return;
        }

        const name = (user.name || user.email.split('@')[0]) as string;
        setVisitorName(name);
        setVisitorType('registered');
        isRegisteredRef.current = true;

        if (!identifiedFromStorage) {
          try {
            localStorage.setItem(LS_KEYS.name, name);
            localStorage.setItem(LS_KEYS.type, 'registered');
          } catch { /* ignore */ }
        }

        // Pull personality from DB — source of truth for registered users
        try {
          const res = await fetch('/api/profile/personality');
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              setVisitorProfileState(data.profile as VisitorProfile);
              try {
                localStorage.setItem(LS_KEYS.profile, JSON.stringify(data.profile));
              } catch { /* ignore */ }
            }
            if (data.docentName) {
              setDocentNameState(data.docentName);
              docentNameRef.current = data.docentName;
              try {
                localStorage.setItem(LS_KEYS.docentName, data.docentName);
              } catch { /* ignore */ }
            }
          }
        } catch { /* fall back to localStorage profile */ }

        setIsProfileLoading(false);
      })
      .catch(() => { setIsProfileLoading(false); });
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────────

  const setVisitorIdentity = (name: string, type: 'guest' | 'registered') => {
    setVisitorName(name);
    setVisitorType(type);
    if (type === 'registered') {
      isRegisteredRef.current = true;
      try {
        localStorage.setItem(LS_KEYS.name, name);
        localStorage.setItem(LS_KEYS.type, type);
      } catch { /* ignore */ }
    } else {
      // Guest: session-scoped only — no localStorage persistence
      try {
        sessionStorage.setItem(SS_KEYS.name, name);
        // Clean up any stale localStorage guest data
        localStorage.removeItem(LS_KEYS.name);
        localStorage.removeItem(LS_KEYS.type);
      } catch { /* ignore */ }
    }
  };

  const setDocentName = (name: string) => {
    setDocentNameState(name);
    docentNameRef.current = name;
    try {
      if (isRegisteredRef.current) {
        localStorage.setItem(LS_KEYS.docentName, name);
      } else {
        sessionStorage.setItem(SS_KEYS.docentName, name);
      }
    } catch { /* ignore */ }
  };

  const setVisitorProfile = (profile: VisitorProfile) => {
    setVisitorProfileState(profile);
    try {
      if (isRegisteredRef.current) {
        localStorage.setItem(LS_KEYS.profile, JSON.stringify(profile));
      } else {
        sessionStorage.setItem(SS_KEYS.profile, JSON.stringify(profile));
      }
    } catch { /* ignore */ }
    // Immediately flush to DB for registered users — high value moment (end of onboarding)
    if (isRegisteredRef.current) {
      flushProfileToDB(profile, docentNameRef.current);
    }
  };

  const updateVisitorProfile = useCallback((patch: Partial<VisitorProfile>) => {
    setVisitorProfileState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      try {
        if (isRegisteredRef.current) {
          localStorage.setItem(LS_KEYS.profile, JSON.stringify(updated));
        } else {
          sessionStorage.setItem(SS_KEYS.profile, JSON.stringify(updated));
        }
      } catch { /* ignore */ }
      scheduleDBFlush(updated);
      return updated;
    });
  }, [scheduleDBFlush]);

  const clearVisitorProfile = () => {
    setVisitorProfileState(null);
    setDocentNameState(null);
    docentNameRef.current = null;
    try {
      localStorage.removeItem(LS_KEYS.profile);
      localStorage.removeItem(LS_KEYS.docentName);
      sessionStorage.removeItem(SS_KEYS.profile);
      sessionStorage.removeItem(SS_KEYS.docentName);
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
      localStorage.removeItem(LS_KEYS.name);
      localStorage.removeItem(LS_KEYS.type);
      localStorage.removeItem(LS_KEYS.docentName);
      localStorage.removeItem(LS_KEYS.profile);
      sessionStorage.removeItem(SS_KEYS.name);
      sessionStorage.removeItem(SS_KEYS.docentName);
      sessionStorage.removeItem(SS_KEYS.profile);
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
