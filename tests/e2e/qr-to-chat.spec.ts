import { test, expect } from '@playwright/test'

test.describe('QR to Chat Flow', () => {
  test('should navigate from QR scan to artwork chat', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera'])
    
    await page.goto('/scan')
    
    // Check if QR scanner is loaded
    await expect(page.locator('text=Scan Artwork QR Code')).toBeVisible()
    
    // Use manual input fallback for testing
    await page.fill('input[placeholder*="artwork ID"]', 'test-artwork-1')
    await page.click('button:has-text("Find Artwork")')
    
    // Should navigate to artwork page
    await expect(page).toHaveURL('/artwork/test-artwork-1')
    
    // Should show artwork information and chat interface
    await expect(page.locator('h1')).toContainText('The Starry Night') // Sample artwork
    await expect(page.locator('text=Artwork Conversation')).toBeVisible()
    
    // Test chat functionality
    await page.fill('input[placeholder*="Ask about"]', 'Tell me about this painting')
    await page.click('button:has-text("Send")' )
    
    // Should show user message
    await expect(page.locator('text=Tell me about this painting')).toBeVisible()
    
    // Should show loading state then AI response
    await expect(page.locator('.animate-bounce')).toBeVisible() // Loading dots
  })

  test('should handle invalid artwork ID', async ({ page }) => {
    await page.goto('/scan')
    
    await page.fill('input[placeholder*="artwork ID"]', 'invalid-id')
    await page.click('button:has-text("Find Artwork")')
    
    // Should show error message
    await expect(page.locator('text=Artwork not found')).toBeVisible()
    
    // Should stay on scan page
    await expect(page).toHaveURL('/scan')
  })
})