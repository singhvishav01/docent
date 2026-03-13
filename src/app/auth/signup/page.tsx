import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0A07', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      <SignupForm />
    </div>
  )
}
