import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

// FIXED: Allow both cuid and custom artwork ID formats (uppercase and lowercase)
export const artworkIdSchema = z.string()
  .min(1, 'Artwork ID is required')
  .refine((val) => {
    // Allow cuid format (starts with 'c' and is 20+ chars)
    if (val.match(/^c[a-z0-9]{20,}$/)) return true
    
    // Allow custom format like DOCENT-001, test-artwork-1, ART-123, etc.
    if (val.match(/^[A-Za-z0-9\-_]+$/)) return true
    
    return false
  }, 'Invalid artwork ID format')

// FIXED: Use the updated artworkIdSchema
export const chatMessageSchema = z.object({
  artworkId: artworkIdSchema,
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().cuid().optional()
})