'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
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

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '12px 14px',
  background: 'rgba(242,232,213,0.04)',
  border: '1px solid rgba(201,168,76,0.15)',
  borderRadius: '2px',
  fontFamily: "'Raleway', sans-serif", fontSize: '13px', fontWeight: 300,
  color: '#F2E8D5', outline: 'none', letterSpacing: '0.04em',
  transition: 'border-color 0.2s ease', boxSizing: 'border-box',
}

export function SignupForm() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Account created.')
        router.push('/museums')
        router.refresh()
      } else {
        toast.error(data.error || 'Signup failed')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)' }

  return (
    <div style={{
      width: '100%', maxWidth: '420px',
      background: S.warmBlack,
      border: '1px solid rgba(201,168,76,0.2)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06)',
      padding: '48px 40px',
      position: 'relative',
      fontFamily: S.raleway,
    }}>
      {/* Grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{ fontFamily: S.cinzel, fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.7)', marginBottom: '16px' }}>
          ◆ &nbsp; JOIN WINSTON &nbsp; ◆
        </p>
        <h1 style={{ fontFamily: S.cormorant, fontSize: '32px', fontWeight: 300, color: S.parchment, lineHeight: 1.1, marginBottom: '10px' }}>
          Begin your<br />
          <span style={{ fontStyle: 'italic', color: S.agedGold }}>journey.</span>
        </h1>
        <div style={{ width: '48px', height: '1px', background: 'rgba(201,168,76,0.3)', margin: '16px auto 0' }} />
      </div>

      <form onSubmit={handleSubmit}>
        {[
          { name: 'name', label: 'FULL NAME', type: 'text', placeholder: 'Your name' },
          { name: 'email', label: 'EMAIL', type: 'email', placeholder: 'your.email@example.com' },
          { name: 'password', label: 'PASSWORD', type: 'password', placeholder: '••••••••' },
          { name: 'confirmPassword', label: 'CONFIRM PASSWORD', type: 'password', placeholder: '••••••••' },
        ].map(field => (
          <div key={field.name} style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontFamily: S.cinzel, fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', marginBottom: '8px' }}>
              {field.label}
            </label>
            <input
              name={field.name} type={field.type} required
              value={formData[field.name as keyof typeof formData]}
              onChange={handleChange}
              placeholder={field.placeholder}
              style={{ ...inputStyle }}
              onFocus={focusInput}
              onBlur={blurInput}
            />
            {field.name === 'password' && (
              <p style={{ fontFamily: S.raleway, fontSize: '10px', color: 'rgba(242,232,213,0.25)', marginTop: '6px', letterSpacing: '0.03em' }}>
                Minimum 8 characters
              </p>
            )}
          </div>
        ))}

        <button
          type="submit" disabled={isLoading}
          style={{
            display: 'block', width: '100%', padding: '15px', marginTop: '12px',
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
          {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontFamily: S.raleway, fontSize: '12px', color: 'rgba(242,232,213,0.3)', letterSpacing: '0.05em' }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
