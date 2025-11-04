export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
}
export interface AuthSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}