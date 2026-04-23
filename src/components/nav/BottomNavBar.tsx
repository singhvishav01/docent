'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useBottomNavVisible } from './useBottomNavVisible';

const TABS = [
  {
    label: 'HOME',
    href: '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 1.75 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: 'SCAN',
    href: '/scan',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 1.75 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7H4a1 1 0 00-1 1v1m2-2V6a1 1 0 011-1h1M19 7h1a1 1 0 011 1v1m-2-2V6a1 1 0 00-1-1h-1M5 17H4a1 1 0 01-1-1v-1m2 2v1a1 1 0 001 1h1M19 17h1a1 1 0 001-1v-1m-2 2v1a1 1 0 01-1 1h-1" />
        <rect x="8" y="8" width="3" height="3" rx="0.5" />
        <rect x="13" y="8" width="3" height="3" rx="0.5" />
        <rect x="8" y="13" width="3" height="3" rx="0.5" />
        <path strokeLinecap="round" d="M13 13h3v3" />
      </svg>
    ),
  },
  {
    label: 'MUSEUMS',
    href: '/museums',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 1.75 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 10V21M8 10V21M16 10V21M19 10V21M12 10V21" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10L12 3l9 7" />
      </svg>
    ),
  },
  {
    label: 'PROFILE',
    href: '/profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 1.75 : 1.5}>
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function BottomNavBar() {
  const { visible } = useBottomNavVisible();
  const breakpoint = useBreakpoint();
  const pathname = usePathname();

  // Don't render on tablet/desktop at all (the hook already handles visibility,
  // but this avoids the component being in the DOM unnecessarily)
  if (breakpoint !== 'mobile') return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 45,
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(13,10,7,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(201,168,76,0.12)',
        display: 'flex',
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% + env(safe-area-inset-bottom)))',
        transition: 'transform 0.3s ease',
      }}
    >
      {TABS.map(tab => {
        const active = isActive(tab.href);
        const color = active ? '#C9A84C' : 'rgba(242,232,213,0.38)';
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              padding: '6px 4px 8px',
              color,
              borderTop: active ? '2px solid #C9A84C' : '2px solid transparent',
              transition: 'color 0.2s ease, border-color 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '7px',
              letterSpacing: '0.15em',
              color,
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
