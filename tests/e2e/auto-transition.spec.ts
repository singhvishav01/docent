import { test, expect } from '@playwright/test'

test.describe('Auto-Transition Flow', () => {
  test('should handle artwork transitions during chat', async ({ page }) => {
    // Start with first artwork
    await page.goto('/admin/test-chat')
    
    // Select first artwork
    await page.click('[data-artwork-id="test-artwork-1"]')
    
    // Wait for chat interface to load
    await expect(page.locator('text=Artwork Conversation')).toBeVisible()
    
    // Start a conversation
    await page.fill('input[placeholder*="Ask about"]', 'What style is this?')
    await page.click('button[type="submit"]')
    
    // While AI is responding, select a different artwork
    await page.click('[data-artwork-id="test-artwork-2"]')
    
    // Should see transition indicator
    await expect(page.locator('text=Up Next')).toBeVisible()
    await expect(page.locator('text=test-artwork-2')).toBeVisible()
    
    // Wait for transition to complete
    await page.waitForTimeout(3000) // Wait for transition delay
    
    // Should now show new artwork as current
    await expect(page.locator('text=Now Viewing')).toBeVisible()
    await expect(page.locator('text=Now Viewing').locator('..').locator('text=test-artwork-2')).toBeVisible()
  })

  test('should prioritize most recent scan in rapid succession', async ({ page }) => {
    await page.goto('/admin/test-chat')
    
    // Rapidly select multiple artworks
    await page.click('[data-artwork-id="test-artwork-1"]')
    await page.click('[data-artwork-id="test-artwork-2"]')
    await page.click('[data-artwork-id="test-artwork-3"]')
    
    // Should show the last selected artwork as "Up Next"
    await expect(page.locator('text=Up Next').locator('..').locator('text=test-artwork-3')).toBeVisible()
    
    // Force transition to see result
    await page.click('button:has-text("Force Transition")')
    
    // Should transition to artwork-3, not artwork-1 or artwork-2
    await expect(page.locator('text=Now Viewing').locator('..').locator('text=test-artwork-3')).toBeVisible()
  })
})
