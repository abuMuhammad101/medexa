import { expect, test } from '@playwright/test';

/**
 * Full path: add patient -> Save & Continue -> Live Session (Missing documentation)
 * -> keep suggestions -> stop -> walk 3 review cards -> clear denial loop
 * -> submit -> Cleared on the dashboard with updated KPIs.
 */
test('full demo path', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByText('1,284').first()).toBeVisible();

  // Speed up the simulation
  await page.keyboard.press('Shift+D');
  await page.getByRole('radio', { name: 'Missing documentation' }).click();
  await page.getByRole('radio', { name: '4x' }).click();
  await page.keyboard.press('Shift+D');

  // Add patient (existing Emirates ID -> lookup fills name and payer)
  await page.getByRole('button', { name: 'Add new Patient' }).click();
  await page.getByLabel('Emirates ID').fill('784196844710291');
  await expect(page.getByText('Found existing patient: Samuel Thompson')).toBeVisible();
  await page.locator('#pm-dept').click();
  await page.getByRole('option', { name: 'Physiotherapy' }).click();
  await page.locator('#pm-visit').click();
  await page.getByRole('option', { name: 'Follow-up' }).click();
  await expect(page.getByText('Eligible for Physiotherapy')).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue' }).click();

  // Live session
  await expect(page).toHaveURL(/\/session\//);
  await page.getByLabel('Patient has consented to ambient recording').check();
  await page.getByRole('button', { name: 'Start' }).click();
  const demoAudio = page.getByRole('button', { name: 'Use demo audio' });
  if (await demoAudio.isVisible().catch(() => false)) await demoAudio.click();

  await expect(page.getByRole('button', { name: /Keep all high-confidence/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Keep all high-confidence/ }).click();
  await expect(page.getByText('2 issues found that may impact claim approval.', { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  for (let i = 0; i < 8; i++) await page.keyboard.press('k');

  // Voice "Stop" (simulated with S) -> confirm
  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page).toHaveURL(/\/review\/.+\/1/, { timeout: 15_000 });

  // Walk the cards
  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(page).toHaveURL(/\/review\/.+\/2/);
  await expect(page.getByText('78.4%').first()).toBeVisible();
  await page.getByRole('button', { name: 'Open Active Denial Loop' }).click();
  await page.getByRole('button', { name: /Apply fix: Link to/ }).click();
  await page.getByRole('button', { name: /Apply fix: Add ODI/ }).click();
  await expect(page.getByText('No active denials').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(page).toHaveURL(/\/review\/.+\/3/);

  // Send -> Submit
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: /Submit claim to NPHIES/ }).click();
  await expect(page.getByText('Accepted')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('dialog').getByText(/CLM-2026-/)).toBeVisible();
  await page.getByRole('button', { name: 'Back to Control room' }).click();

  // Dashboard reflects the cleared claim
  await expect(page.getByText('Claim submitted').first()).toBeVisible();
  await expect(page.getByText('83').first()).toBeVisible();
});

test('?fail=submit shows network error, then rejection, then acceptance', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  // open a seeded, cleanly coded encounter's review directly (replays the scenario)
  await page.goto('/review/e2/1?fail=submit');
  await page.getByRole('button', { name: 'Next card' }).click();
  await page.getByRole('button', { name: 'Next card' }).click();
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: /Submit claim to NPHIES/ }).click();
  await expect(page.getByText('Network error')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Rejected by payer')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Fix and resubmit' }).click();
  await page.getByRole('button', { name: /Apply fix: Re-verify eligibility/ }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: /Submit claim to NPHIES/ }).click();
  await expect(page.getByText('Accepted')).toBeVisible({ timeout: 15_000 });
});
