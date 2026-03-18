'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const S = {
  warmBlack: '#0D0A07',
  agedGold: '#C9A84C',
  parchment: '#F2E8D5',
  dustyRose: '#A67B6B',
  cormorant: "'Cormorant Garamond', serif",
  cinzel: "'Cinzel', serif",
  raleway: "'Raleway', sans-serif",
}

export function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setMessage('Welcome back.')
        if (redirectTo) {
          router.push(redirectTo)
        } else if (data.user.role === 'admin') {
          router.push('/admin/dashboard')
        } else if (data.user.role === 'curator') {
          router.push('/curator')
        } else {
          router.push('/museums')
        }
        router.refresh()
      } else {
        setIsSuccess(false)
        setMessage(data.error || 'Sign in failed. Please check your credentials.')
      }
    } catch {
      setIsSuccess(false)
      setMessage('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div style={{
      width: '100%', maxWidth: '420px',
      background: '#0D0A07',
      border: '1px solid rgba(201,168,76,0.2)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06)',
      padding: '48px 40px',
      position: 'relative',
      fontFamily: S.raleway,
    }}>
      {/* Grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{ fontFamily: S.cinzel, fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.7)', marginBottom: '16px' }}>
          ◆ &nbsp; WELCOME BACK &nbsp; ◆
        </p>
        <h1 style={{ fontFamily: S.cormorant, fontSize: '32px', fontWeight: 300, color: S.parchment, lineHeight: 1.1, marginBottom: '10px' }}>
          Sign in to<br />
          <span style={{ fontStyle: 'italic', color: S.agedGold }}>DOCENT</span>
        </h1>
        <div style={{ width: '48px', height: '1px', background: 'rgba(201,168,76,0.3)', margin: '16px auto 0' }} />
      </div>

      {/* Message */}
      {message && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px',
          background: isSuccess ? 'rgba(201,168,76,0.08)' : 'rgba(92,26,26,0.3)',
          border: `1px solid ${isSuccess ? 'rgba(201,168,76,0.3)' : 'rgba(166,123,107,0.3)'}`,
          fontFamily: S.raleway, fontSize: '12px', letterSpacing: '0.04em',
          color: isSuccess ? S.agedGold : S.dustyRose,
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '8px' }}>
            EMAIL
          </label>
          <input
            name="email" type="email" required
            value={formData.email} onChange={handleChange}
            placeholder="your.email@example.com"
            style={{ ...inputStyle }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)')}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '8px' }}>
            PASSWORD
          </label>
          <input
            name="password" type="password" required
            value={formData.password} onChange={handleChange}
            placeholder="••••••••"
            style={{ ...inputStyle }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)')}
          />
        </div>

        <button
          type="submit" disabled={isLoading}
          style={{
            display: 'block', width: '100%', padding: '15px',
            background: isLoading ? 'rgba(201,168,76,0.3)' : S.agedGold,
            border: 'none', cursor: isLoading ? 'default' : 'pointer',
            fontFamily: S.cinzel, fontSize: '11px', letterSpacing: '0.3em',
            color: isLoading ? 'rgba(201,168,76,0.5)' : S.warmBlack,
            fontWeight: 600, transition: 'background 0.2s ease',
            marginBottom: '24px',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = S.parchment }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.background = S.agedGold }}
        >
          {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontFamily: S.raleway, fontSize: '12px', color: 'rgba(242,232,213,0.3)', letterSpacing: '0.05em' }}>
        No account?{' '}
        <Link href="/auth/signup" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
          Create one
        </Link>
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '12px 14px',
  background: 'rgba(242,232,213,0.04)',
  border: '1px solid rgba(201,168,76,0.15)',
  borderRadius: '2px',
  fontFamily: "'Raleway', sans-serif", fontSize: '13px', fontWeight: 300,
  color: '#F2E8D5', outline: 'none', letterSpacing: '0.04em',
  transition: 'border-color 0.2s ease', boxSizing: 'border-box',
}
