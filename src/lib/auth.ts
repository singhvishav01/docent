// src/lib/auth.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from './db'
import type { User, UserRole, AuthPayload } from '@/types/auth'
import { NextRequest } from 'next/server'

const JWT_SECRET: string = process.env.JWT_SECRET as string
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set')
}

const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as UserRole,
      createdAt: user.createdAt
    }
  } catch {
    return null
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/'
  })
}

export function clearAuthCookie() {
  const cookieStore = cookies()
  cookieStore.delete('auth-token')
}

// Rate limiting for auth endpoints
const authAttempts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const maxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5')
  const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW || '15') * 60 * 1000

  const attempts = authAttempts.get(identifier)

  if (!attempts || now > attempts.resetTime) {
    authAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  return true
}

export async function verifyRequestAuth(req: NextRequest): Promise<AuthPayload | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      return verifyToken(token)
    }

    const cookieHeader = req.headers.get('cookie')
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      )
      const token = cookies['auth-token']
      if (token) {
        return verifyToken(token)
      }
    }

    return null
  } catch {
    return null
  }
}

// Role checking helpers
export function requireRole(user: User | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false
  return allowedRoles.includes(user.role)
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}

export function isCurator(user: User | null): boolean {
  return user?.role === 'curator'
}

export function isCuratorOrAdmin(user: User | null): boolean {
  return user?.role === 'curator' || user?.role === 'admin'
}