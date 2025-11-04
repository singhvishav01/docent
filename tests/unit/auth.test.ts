import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth'

describe('Authentication', () => {
  test('should hash password correctly', async () => {
    const password = 'testpassword123'
    const hashed = await hashPassword(password)
    
    expect(hashed).not.toBe(password)
    expect(hashed.length).toBeGreaterThan(10)
  })

  test('should verify password correctly', async () => {
    const password = 'testpassword123'
    const hashed = await hashPassword(password)
    
    const isValid = await verifyPassword(password, hashed)
    const isInvalid = await verifyPassword('wrongpassword', hashed)
    
    expect(isValid).toBe(true)
    expect(isInvalid).toBe(false)
  })

  test('should generate and verify JWT tokens', () => {
    const userId = 'test-user-id'
    const token = generateToken(userId)
    
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    
    const payload = verifyToken(token)
    expect(payload?.userId).toBe(userId)
  })

  test('should reject invalid tokens', () => {
    const invalidToken = 'invalid-token'
    const payload = verifyToken(invalidToken)
    
    expect(payload).toBe(null)
  })
})