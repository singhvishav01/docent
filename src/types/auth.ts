// src/types/auth.ts
export type UserRole = 'admin' | 'curator' | 'visitor'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  createdAt: Date
}

export interface AuthSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface AuthPayload {
  userId: string
  role: UserRole
}