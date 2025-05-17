import { test, expect } from '@playwright/test'

test('basic app loading', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/CVSS/i)

  await expect(page.locator('body')).toBeVisible()
})
