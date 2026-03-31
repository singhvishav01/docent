'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVisitor } from '@/contexts/VisitorContext';
import { NameYourDocent } from '@/components/onboarding/NameYourDocent';
import AcquaintanceIntro from '@/components/onboarding/AcquaintanceIntro';
import { VisitorProfile } from '@/lib/acquaintance/profile';

// ─── Minimal Zustand-like store (no extra dependency) ─────────────────────────
type Resolver = () => void;

interface GateStore {
  isOpen: boolean;
  resolvers: Resolver[];
  open: (onResolve: Resolver) => void;
  resolve: () => void;
}

let _state: GateStore = {
  isOpen: false,
  resolvers: [],
  open: () => {},
  resolve: () => {},
};
const _listeners: Set<() => void> = new Set();

function createStore(): GateStore {
  const store: GateStore = {
    isOpen: false,
    resolvers: [],
    open(onResolve) {
      store.isOpen = true;
      store.resolvers.push(onResolve);
      _listeners.forEach(l => l());
    },
    resolve() {
      store.isOpen = false;
      const cbs = [...store.resolvers];
      store.resolvers = [];
      _listeners.forEach(l => l());
      cbs.forEach(cb => cb());
    },
  };
  return store;
}

_state = createStore();

export function useVisitorGateStore<T>(selector: (s: GateStore) => T): T {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);
  return selector(_state);
}

// ─── Component ─────────────────────────────────────────────────────────────────

type Step = 'choice' | 'name' | 'docent-name' | 'acquaintance';

export function VisitorGateModal() {
  const { setVisitorIdentity, setDocentName, setVisitorProfile, visitorName, docentName, visitorProfile, isProfileLoading } = useVisitor();
  const router = useRouter();
  const isOpen = useVisitorGateStore(s => s.isOpen);

  // Auto-resolve: gate opened while DB was still loading, but profile came back
  // with intro_complete === true → close without showing anything
  useEffect(() => {
    if (isOpen && !isProfileLoading && visitorProfile?.intro_complete === true) {
      _state.resolve();
    }
  }, [isOpen, isProfileLoading, visitorProfile]);

  const [step, setStep] = useState<Step>('choice');
  const [name, setName] = useState('');
  const [pendingVisitorName, setPendingVisitorName] = useState<string>('');
  const [pendingDocentName, setPendingDocentName] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // When the modal opens, pick the right starting step
  useEffect(() => {
    if (!isOpen) { setAnimateIn(false); return; }
    setName('');
    setTimeout(() => setAnimateIn(true), 10);
    // Step is resolved once loading is done — see effect below
  }, [isOpen]);

  // Re-evaluate step whenever loading state or identity changes while modal is open
  useEffect(() => {
    if (!isOpen || isProfileLoading) return;
    // Already done — auto-resolve handles it
    if (visitorProfile?.intro_complete === true) return;
    // Registered / named user who hasn't done intro: skip straight to acquaintance
    if (visitorName) {
      setPendingVisitorName(visitorName);
      setPendingDocentName(docentName);
      setStep(docentName ? 'acquaintance' : 'docent-name');
    } else {
      setStep('choice');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isProfileLoading, visitorName]);

  // Focus input when step 2 renders
  useEffect(() => {
    if (step === 'name') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // While DB is loading, show nothing (auto-resolve effect handles it if intro is done)
  if (!isOpen) return null;
  if (isProfileLoading) return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)' }}>
        ···
      </p>
    </div>
  );

  const handleSignIn = () => {
    _state.resolve();
    router.push('/auth/login');
  };

  const handleGuestClick = () => {
    setStepTransition(true);
    setTimeout(() => {
      setStep('name');
      setStepTransition(false);
    }, 250);
  };

  const handleNameSubmit = (submittedName?: string) => {
    const finalName = (submittedName ?? name).trim() || 'Guest';
    setVisitorIdentity(finalName, 'guest');
    setPendingVisitorName(finalName);
    setStepTransition(true);
    setTimeout(() => {
      setStep('docent-name');
      setStepTransition(false);
    }, 250);
  };

  const handleDocentNameSelect = (chosenName: string) => {
    setDocentName(chosenName);
    setPendingDocentName(chosenName);
    setStepTransition(true);
    setTimeout(() => {
      setStep('acquaintance');
      setStepTransition(false);
    }, 250);
  };

  const handleAcquaintanceComplete = (profile: VisitorProfile) => {
    setVisitorProfile(profile);
    _state.resolve();
  };

  const handleAnonymous = () => {
    // Don't skip the intro — set identity as Guest and continue to docent selection
    setVisitorIdentity('Guest', 'guest');
    setPendingVisitorName('Guest');
    setStepTransition(true);
    setTimeout(() => {
      setStep('docent-name');
      setStepTransition(false);
    }, 250);
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          background: '#0D0A07',
          border: '1px solid rgba(201,168,76,0.22)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.08)',
          borderRadius: '4px',
          width: '100%',
          maxWidth: step === 'acquaintance' ? '480px' : '440px',
          padding: step === 'acquaintance' ? '36px 32px 32px' : '48px 40px',
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          fontFamily: "'Raleway', sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grain overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
        }} />

        {/* Step content */}
        <div style={{
          opacity: stepTransition ? 0 : 1,
          transform: stepTransition ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          {step === 'choice' ? <ChoiceStep onSignIn={handleSignIn} onGuest={handleGuestClick} /> : null}
          {step === 'name' ? (
            <NameStep
              name={name}
              onChange={setName}
              onSubmit={handleNameSubmit}
              onAnonymous={handleAnonymous}
              inputRef={inputRef}
            />
          ) : null}
          {step === 'docent-name' ? (
            <NameYourDocent
              visitorName={pendingVisitorName || null}
              onSelect={handleDocentNameSelect}
            />
          ) : null}
          {step === 'acquaintance' ? (
            <AcquaintanceIntro
              visitorName={pendingVisitorName || null}
              docentName={pendingDocentName}
              onComplete={handleAcquaintanceComplete}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Choice ────────────────────────────────────────────────────────────

function ChoiceStep({ onSignIn, onGuest }: { onSignIn: () => void; onGuest: () => void }) {
  return (
    <>
      {/* Eyebrow */}
      <p style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '10px',
        letterSpacing: '0.5em',
        color: 'rgba(201,168,76,0.7)',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        ◆ &nbsp; YOUR GUIDE AWAITS &nbsp; ◆
      </p>

      {/* Heading */}
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'clamp(28px, 5vw, 38px)',
        fontWeight: 300,
        color: '#F2E8D5',
        lineHeight: 1.15,
        marginBottom: '20px',
        textAlign: 'center',
      }}>
        DOCENT remembers<br />
        <span style={{ fontStyle: 'italic', color: '#C9A84C' }}>his visitors.</span>
      </h2>

      {/* Gold divider */}
      <div style={{ width: '48px', height: '1px', background: 'rgba(201,168,76,0.4)', margin: '0 auto 20px' }} />

      {/* Description */}
      <p style={{
        fontSize: '13px',
        fontWeight: 300,
        color: 'rgba(242,232,213,0.5)',
        lineHeight: 1.85,
        letterSpacing: '0.03em',
        marginBottom: '36px',
        textAlign: 'center',
      }}>
        Registered visitors get a curated experience that remembers what you love, picks up where you left off, and gets better every visit.
      </p>

      {/* Primary CTA */}
      <button
        onClick={onSignIn}
        style={{
          display: 'block',
          width: '100%',
          padding: '16px',
          background: '#C9A84C',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: '#0D0A07',
          marginBottom: '16px',
          transition: 'background 0.2s ease',
          fontWeight: 600,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F2E8D5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#C9A84C')}
      >
        SIGN IN / CREATE ACCOUNT
      </button>

      {/* Secondary CTA */}
      <button
        onClick={onGuest}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Raleway', sans-serif",
          fontSize: '12px',
          letterSpacing: '0.15em',
          color: 'rgba(242,232,213,0.35)',
          marginBottom: '20px',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.35)')}
      >
        Continue as Guest →
      </button>

      {/* Warning */}
      <p style={{
        fontSize: '10px',
        fontStyle: 'italic',
        color: 'rgba(166,123,107,0.45)',
        lineHeight: 1.7,
        textAlign: 'center',
        letterSpacing: '0.03em',
      }}>
        Guest sessions aren't saved. Future visits won't remember your preferences or history.
      </p>
    </>
  );
}

// ─── Step 2: Name capture ──────────────────────────────────────────────────────

function NameStep({
  name, onChange, onSubmit, onAnonymous, inputRef
}: {
  name: string;
  onChange: (v: string) => void;
  onSubmit: (name?: string) => void;
  onAnonymous: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <>
      <p style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '10px',
        letterSpacing: '0.5em',
        color: 'rgba(201,168,76,0.7)',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        ◆ &nbsp; ALMOST THERE &nbsp; ◆
      </p>

      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 'clamp(24px, 4vw, 32px)',
        fontWeight: 300,
        color: '#F2E8D5',
        lineHeight: 1.2,
        marginBottom: '12px',
        textAlign: 'center',
      }}>
        What shall DOCENT<br />
        <span style={{ fontStyle: 'italic', color: '#C9A84C' }}>call you?</span>
      </h2>

      <p style={{
        fontSize: '12px',
        fontWeight: 300,
        color: 'rgba(242,232,213,0.4)',
        textAlign: 'center',
        marginBottom: '32px',
        letterSpacing: '0.05em',
      }}>
        Just your first name is fine.
      </p>

      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSubmit(); }}
        placeholder="Your name..."
        maxLength={40}
        style={{
          display: 'block',
          width: '100%',
          padding: '14px 16px',
          background: 'rgba(242,232,213,0.04)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '2px',
          fontFamily: "'Raleway', sans-serif",
          fontSize: '14px',
          fontWeight: 300,
          color: '#F2E8D5',
          marginBottom: '20px',
          outline: 'none',
          letterSpacing: '0.05em',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)')}
      />

      <button
        onClick={() => onSubmit()}
        disabled={!name.trim()}
        style={{
          display: 'block',
          width: '100%',
          padding: '16px',
          background: name.trim() ? '#C9A84C' : 'rgba(201,168,76,0.2)',
          border: 'none',
          cursor: name.trim() ? 'pointer' : 'default',
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: name.trim() ? '#0D0A07' : 'rgba(201,168,76,0.4)',
          marginBottom: '20px',
          transition: 'all 0.2s ease',
          fontWeight: 600,
        }}
        onMouseEnter={e => { if (name.trim()) e.currentTarget.style.background = '#F2E8D5'; }}
        onMouseLeave={e => { if (name.trim()) e.currentTarget.style.background = '#C9A84C'; }}
      >
        LET'S BEGIN →
      </button>

      <button
        onClick={onAnonymous}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Raleway', sans-serif",
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: 'rgba(242,232,213,0.2)',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.2)')}
      >
        Continue anonymously
      </button>
    </>
  );
}
