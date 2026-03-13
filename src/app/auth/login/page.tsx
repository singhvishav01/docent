import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0A07', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
      <LoginForm />
    </div>
  )
}
