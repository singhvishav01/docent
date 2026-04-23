'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVisitorGate } from '@/hooks/useVisitorGate';
import { useVisitorGateStore } from '@/components/auth/VisitorGateModal';
import { BottomNavSpacer } from '@/components/nav/BottomNavSpacer';

// ─── Data ──────────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    name: 'Mona Lisa',
    artist: 'Leonardo da Vinci · c. 1503',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    name: 'The Starry Night',
    artist: 'Vincent van Gogh · 1889',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Raphael_School_of_Athens.jpg/1280px-Raphael_School_of_Athens.jpg',
    name: 'School of Athens',
    artist: 'Raphael · 1511',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/1280px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
    name: 'Creation of Adam',
    artist: 'Michelangelo · 1512',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Vermeer_-_Girl_with_a_Pearl_Earring.jpg/767px-Vermeer_-_Girl_with_a_Pearl_Earring.jpg',
    name: 'Girl with a Pearl Earring',
    artist: 'Johannes Vermeer · c. 1665',
  },
];

const ARTISTS = [
  'DA VINCI', 'VAN GOGH', 'MICHELANGELO', 'RAPHAEL', 'VERMEER',
  'REMBRANDT', 'CARAVAGGIO', 'BOTTICELLI', 'MONET', 'PICASSO',
  'LOUVRE', 'MET', 'UFFIZI', 'PRADO', 'RIJKSMUSEUM', 'HERMITAGE',
];

const CHAT_MESSAGES = [
  { role: 'docent', text: "You're standing before Van Gogh's Starry Night. Painted in 1889 — during his time at Saint-Paul-de-Mausole. What you see isn't chaos. It's grief, made beautiful." },
  { role: 'user', text: "Why does it feel so alive?" },
  { role: 'docent', text: "The swirling strokes — Van Gogh called it 'the terrible passions of humanity.' He painted from memory, at night. The village below is imagined. The sky is everything he felt." },
  { role: 'user', text: "What's that bright star on the right?" },
  { role: 'docent', text: "Venus. Van Gogh was obsessed with the night sky. He once wrote to his brother Theo — 'I want to paint the starry sky.' This was his answer." },
];

const FEATURES = [
  'Knows what you\'re standing near',
  'Remembers your past visits',
  'Curates tours around your interests',
  'Speaks — and listens',
];

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  warmBlack: '#0D0A07',
  agedGold: '#C9A84C',
  parchment: '#F2E8D5',
  deepBurgundy: '#5C1A1A',
  darkBronze: '#3D2B1F',
  dustyRose: '#A67B6B',
  cormorant: "'Cormorant Garamond', serif",
  cinzel: "'Cinzel', serif",
  raleway: "'Raleway', sans-serif",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatRunning, setChatRunning] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatObservedRef = useRef(false);
  const router = useRouter();
  const { requireIdentity } = useVisitorGate();
  const openGate = useVisitorGateStore(s => s.open);

  // Hero fade-in
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(c => (c + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Chat animation — starts when scrolled into view
  useEffect(() => {
    if (!chatRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !chatObservedRef.current) {
            chatObservedRef.current = true;
            startChat();
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(chatRef.current);
    return () => observer.disconnect();
  }, []);

  async function startChat() {
    if (chatRunning) return;
    setChatRunning(true);
    setChatMessages([]);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const msg of CHAT_MESSAGES) {
      if (msg.role === 'docent') {
        await delay(900);
        // Typing indicator
        setChatMessages(m => [...m, { role: 'typing', text: '' }]);
        await delay(1800);
        setChatMessages(m => [...m.filter(x => x.role !== 'typing'), msg]);
        await delay(2200);
      } else {
        await delay(1200);
        setChatMessages(m => [...m, msg]);
        await delay(1000);
      }
    }

    // Loop after pause
    await delay(4000);
    chatObservedRef.current = false;
    setChatRunning(false);
    setChatMessages([]);
    startChat();
  }

  const handleBeginJourney = () => {
    router.push('/auth/login');
  };

  const handleGuestContinue = () => {
    // Always open the gate modal regardless of current identity
    new Promise<void>(resolve => openGate(resolve)).then(() => {
      router.push('/museums');
    });
  };

  return (
    <div style={{ background: S.warmBlack, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Nav */}
        <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top) + 32px) 48px 32px' }}>
          <div>
            <div style={{ fontFamily: S.cinzel, fontSize: '14px', letterSpacing: '0.4em', color: S.parchment }}>DOCENT</div>
            <div style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.6em', color: S.agedGold, opacity: 0.7, marginTop: '2px' }}>MUSEUM DOCENT</div>
          </div>
          <div style={{ fontFamily: S.raleway, fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(242,232,213,0.4)' }}>EST. 2025</div>
        </nav>

        {/* Slides */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${slide.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: i === currentSlide ? 1 : 0,
                transition: 'opacity 1.8s ease',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(13,10,7,0.85) 0%, rgba(92,26,26,0.25) 50%, rgba(13,10,7,0.75) 100%)',
              }} />
            </div>
          ))}
        </div>

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 4, textAlign: 'center', padding: '0 20px',
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 1.5s ease, transform 1.5s ease',
        }}>
          <p style={{ fontFamily: S.cinzel, fontSize: '11px', letterSpacing: '0.5em', color: S.agedGold, marginBottom: '24px', opacity: 0.8 }}>
            YOUR PERSONAL MUSEUM GUIDE
          </p>
          <h1 style={{ fontFamily: S.cormorant, fontSize: 'clamp(72px, 12vw, 140px)', fontWeight: 300, color: S.parchment, lineHeight: 0.9, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Art<br />
            <span style={{ fontStyle: 'italic', color: S.agedGold }}>Speaks.</span>
          </h1>
          <p style={{ fontFamily: S.cormorant, fontSize: 'clamp(16px, 2.5vw, 22px)', fontWeight: 300, fontStyle: 'italic', color: 'rgba(242,232,213,0.6)', margin: '20px 0 48px', letterSpacing: '0.05em' }}>
            DOCENT remembers what moves you.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <PrimaryButton onClick={handleBeginJourney}>BEGIN YOUR JOURNEY</PrimaryButton>
            <GhostButton onClick={handleGuestContinue}>CONTINUE AS GUEST</GhostButton>
          </div>
        </div>

        {/* Slide indicators */}
        <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SLIDES.map((slide, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: '1px',
                height: i === currentSlide ? '48px' : '32px',
                background: i === currentSlide ? S.agedGold : 'rgba(201,168,76,0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
              title={slide.name}
            />
          ))}
        </div>

        {/* Current artwork label */}
        <div style={{ position: 'absolute', bottom: '80px', left: '48px', zIndex: 5 }}>
          <p style={{ fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.4em', color: S.agedGold, opacity: 0.6, marginBottom: '6px' }}>NOW FEATURING</p>
          <p style={{ fontFamily: S.cormorant, fontSize: '28px', fontWeight: 300, fontStyle: 'italic', color: S.parchment, opacity: 0.85, transition: 'opacity 0.8s ease' }}>
            {SLIDES[currentSlide].name}
          </p>
          <p style={{ fontFamily: S.raleway, fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(242,232,213,0.4)', marginTop: '4px' }}>
            {SLIDES[currentSlide].artist}
          </p>
        </div>

        {/* Artist strip marquee */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
          overflow: 'hidden', padding: '14px 0',
          borderTop: '1px solid rgba(201,168,76,0.2)',
          background: 'linear-gradient(90deg, rgba(13,10,7,0.95), rgba(61,43,31,0.7), rgba(13,10,7,0.95))',
        }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'docentScroll 30s linear infinite',
          }}>
            {[...ARTISTS, ...ARTISTS].map((a, i) => (
              i % 1 === 0 ? (
                <span key={i} style={{ fontFamily: S.cinzel, fontSize: '11px', letterSpacing: '0.3em', color: S.agedGold, opacity: 0.7, padding: '0 40px' }}>{a}</span>
              ) : (
                <span key={i} style={{ color: S.dustyRose, opacity: 0.4, padding: '0 10px', fontSize: '8px' }}>◆</span>
              )
            )).reduce<JSX.Element[]>((acc, el, i) => {
              acc.push(el);
              if (i < [...ARTISTS, ...ARTISTS].length * 2 - 2) {
                acc.push(<span key={`dot-${i}`} style={{ color: S.dustyRose, opacity: 0.4, padding: '0 10px', fontSize: '8px' }}>◆</span>);
              }
              return acc;
            }, [])}
          </div>
        </div>
      </section>

      {/* ── PREVIEW SECTION ── */}
      <section style={{
        background: `linear-gradient(180deg, ${S.warmBlack} 0%, #0f0c09 100%)`,
        padding: '100px 48px',
        borderTop: '1px solid rgba(201,168,76,0.1)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>

          {/* Left: copy */}
          <div>
            <p style={{ fontFamily: S.cinzel, fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.5)', marginBottom: '16px' }}>◆ &nbsp; EXPERIENCE DOCENT &nbsp; ◆</p>
            <h2 style={{ fontFamily: S.cormorant, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 300, color: S.parchment, lineHeight: 1.1, marginBottom: '24px' }}>
              This is what<br />
              <span style={{ fontStyle: 'italic', color: S.agedGold }}>awaits you.</span>
            </h2>
            <p style={{ fontFamily: S.raleway, fontSize: '14px', fontWeight: 300, color: 'rgba(242,232,213,0.5)', lineHeight: 1.9, letterSpacing: '0.04em', marginBottom: '40px' }}>
              Stand before a masterpiece. DOCENT speaks. Ask anything — history, technique, hidden meaning. Every visit remembered. Every question answered.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: S.raleway, fontSize: '13px', fontWeight: 300, color: 'rgba(242,232,213,0.7)', letterSpacing: '0.05em' }}>
                  <span style={{ color: S.agedGold, fontSize: '8px', flexShrink: 0 }}>◆</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right: phone mockup */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '280px', height: '560px',
              background: '#0a0806',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '40px',
              overflow: 'hidden',
              boxShadow: '0 0 0 1px rgba(201,168,76,0.1), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.1)',
              position: 'relative',
            }}>
              {/* Notch */}
              <div style={{ width: '80px', height: '24px', background: '#0a0806', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '0 0 16px 16px', margin: '0 auto', position: 'relative', zIndex: 2 }} />

              <div style={{ height: 'calc(100% - 24px)', display: 'flex', flexDirection: 'column' }}>
                {/* Artwork bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(201,168,76,0.1)', background: 'rgba(61,43,31,0.3)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.2)', backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/320px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg)', backgroundSize: 'cover', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: S.cormorant, fontSize: '13px', color: S.parchment, fontStyle: 'italic' }}>The Starry Night</p>
                    <p style={{ fontFamily: S.raleway, fontSize: '9px', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', marginTop: '2px' }}>Vincent van Gogh · 1889</p>
                  </div>
                </div>

                {/* Chat window */}
                <div ref={chatRef} style={{ flex: 1, overflow: 'hidden', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatMessages.map((msg, i) => (
                    msg.role === 'typing' ? (
                      <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                        <p style={{ fontFamily: S.cinzel, fontSize: '7px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', marginBottom: '4px' }}>DOCENT</p>
                        <div style={{ background: 'rgba(61,43,31,0.4)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '0 12px 12px 12px', padding: '10px 14px', display: 'flex', gap: '4px' }}>
                          {[0, 1, 2].map(d => (
                            <div key={d} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(201,168,76,0.5)', animation: `typingBounce 1s ${d * 0.2}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div key={i} style={{ alignSelf: msg.role === 'docent' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                        <p style={{ fontFamily: S.cinzel, fontSize: '7px', letterSpacing: '0.3em', color: msg.role === 'docent' ? 'rgba(201,168,76,0.5)' : 'rgba(166,123,107,0.5)', marginBottom: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                          {msg.role === 'docent' ? 'DOCENT' : 'YOU'}
                        </p>
                        <div style={{
                          padding: '10px 14px',
                          background: msg.role === 'docent' ? 'rgba(61,43,31,0.4)' : 'rgba(92,26,26,0.3)',
                          border: `1px solid ${msg.role === 'docent' ? 'rgba(201,168,76,0.15)' : 'rgba(166,123,107,0.2)'}`,
                          borderRadius: msg.role === 'docent' ? '0 12px 12px 12px' : '12px 0 12px 12px',
                          fontFamily: S.raleway,
                          fontSize: '11px',
                          lineHeight: 1.6,
                          fontWeight: 300,
                          color: msg.role === 'docent' ? 'rgba(242,232,213,0.85)' : 'rgba(242,232,213,0.7)',
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* Mic bar */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(13,10,7,0.8)' }}>
                  <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>🎙</div>
                  <p style={{ fontFamily: S.raleway, fontSize: '10px', color: 'rgba(242,232,213,0.2)', letterSpacing: '0.1em', fontStyle: 'italic' }}>Speak to DOCENT...</p>
                </div>
              </div>
            </div>

            {/* Glow */}
            <div style={{ position: 'absolute', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', bottom: '-40px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </section>

      {/* ── SIGNUP CTA ── */}
      <section style={{ background: 'linear-gradient(180deg, #0f0c09 0%, #150f0a 100%)', padding: '100px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ width: '80px', height: '1px', background: S.agedGold, margin: '0 auto 32px', opacity: 0.4 }} />
          <p style={{ fontFamily: S.cinzel, fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', marginBottom: '24px' }}>◆ &nbsp; JOIN DOCENT &nbsp; ◆</p>
          <h2 style={{ fontFamily: S.cormorant, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 300, color: S.parchment, lineHeight: 1.1, marginBottom: '20px' }}>
            DOCENT remembers<br />
            <span style={{ fontStyle: 'italic', color: S.agedGold }}>his visitors.</span>
          </h2>
          <p style={{ fontFamily: S.raleway, fontSize: '13px', fontWeight: 300, color: 'rgba(242,232,213,0.45)', lineHeight: 1.9, letterSpacing: '0.04em', marginBottom: '40px' }}>
            Registered visitors get a curated experience that learns what moves them, picks up where they left off, and gets richer with every visit.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <a href="/auth/signup">
              <PrimaryButton onClick={() => {}} style={{ width: '280px', padding: '18px 40px' }}>CREATE YOUR PROFILE</PrimaryButton>
            </a>
            <button
              onClick={handleGuestContinue}
              style={{
                fontFamily: S.raleway, fontSize: '11px', letterSpacing: '0.2em',
                color: 'rgba(242,232,213,0.3)', background: 'transparent', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px',
                textDecorationColor: 'rgba(242,232,213,0.15)', transition: 'color 0.3s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,232,213,0.3)')}
            >
              Continue as Guest
            </button>
          </div>

          <p style={{ fontFamily: S.raleway, fontSize: '10px', color: 'rgba(166,123,107,0.4)', letterSpacing: '0.05em', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto', fontStyle: 'italic' }}>
            Guest sessions aren't saved. Future visits won't remember your preferences or history.
          </p>
          <div style={{ width: '80px', height: '1px', background: S.agedGold, margin: '48px auto 0', opacity: 0.2 }} />
        </div>
      </section>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes docentScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      <BottomNavSpacer />
    </div>
  );
}

// ─── Button components ─────────────────────────────────────────────────────────

function PrimaryButton({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '11px',
        letterSpacing: '0.3em',
        color: '#0D0A07',
        background: hovered ? '#F2E8D5' : '#C9A84C',
        border: 'none',
        padding: '16px 40px',
        cursor: 'pointer',
        transition: 'background 0.3s ease',
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '11px',
        letterSpacing: '0.3em',
        color: hovered ? '#C9A84C' : 'rgba(242,232,213,0.6)',
        background: 'transparent',
        border: `1px solid ${hovered ? '#C9A84C' : 'rgba(201,168,76,0.3)'}`,
        padding: '16px 40px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
    >
      {children}
    </button>
  );
}
