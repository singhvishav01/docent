import { SignupForm } from '@/components/auth/SignupForm'
import { BackButton } from '@/components/nav/BackButton'

export default function SignupPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0A07', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      <BackButton
        fallbackHref="/"
        style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', left: '16px' }}
      />
      <SignupForm />
    </div>
  )
}
