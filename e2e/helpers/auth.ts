import { expect, type Page } from "@playwright/test"

/** Wait until client auth hydrates and the portal shell is visible. */
export async function waitForPortal(page: Page): Promise<void> {
  await page.goto("/dashboard")
  await expect(
    page.getByRole("heading", { name: "Welcome to PactMind" })
  ).toBeVisible({ timeout: 60_000 })
}
