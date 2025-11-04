import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should complete signup and login flow', async ({ page }) => {
    // Go to signup page
    await page.goto('/auth/signup')
    
    // Fill signup form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpass123')
    await page.fill('input[name="confirmPassword"]', 'testpass123')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to scan page
    await expect(page).toHaveURL('/scan')
    
    // Should show success message
    await expect(page.locator('text=Account created successfully')).toBeVisible()
  })

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible()
    
    // Should stay on login page
    await expect(page).toHaveURL('/auth/login')
  })

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/auth/signup')
    
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', '123') // Too short
    await page.fill('input[name="confirmPassword"]', '123')
    
    await page.click('button[type="submit"]')
    
    // Should show validation error
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
  })
})
