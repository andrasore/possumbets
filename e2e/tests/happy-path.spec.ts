import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill('password');
  await page.locator('#kc-login').click();
}

test('alice logs in, places a bet, sees it in My Bets', async ({ browser }) => {
  // Alice's DB user row is created lazily on her first authed call (see
  // jwt.strategy.ts), so we have to log her in once before bob can see her in
  // the admin user list.
  const aliceWarmupCtx = await browser.newContext();
  const aliceWarmupPage = await aliceWarmupCtx.newPage();
  await loginAs(aliceWarmupPage, 'alice');
  await aliceWarmupPage.waitForURL('**/dashboard');
  await aliceWarmupCtx.close();

  const bobCtx = await browser.newContext();
  const bobPage = await bobCtx.newPage();
  await loginAs(bobPage, 'bob');
  await bobPage.waitForURL('**/admin');

  const aliceRow = bobPage.locator('tr', { hasText: 'alice@example.com' });
  await expect(aliceRow).toBeVisible();
  await aliceRow.getByRole('spinbutton').fill('100');
  await aliceRow.getByRole('button', { name: 'Confirm' }).click();
  await expect(aliceRow.getByRole('button', { name: 'Confirm' })).toBeHidden();
  await bobCtx.close();

  const aliceCtx = await browser.newContext();
  const alicePage = await aliceCtx.newPage();
  await loginAs(alicePage, 'alice');
  await alicePage.waitForURL('**/dashboard');

  const firstCard = alicePage.locator('[data-testid^="event-card-"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  await alicePage.getByTestId('stake-input').fill('10');
  await alicePage.getByTestId('place-bet-button').click();

  await expect(
    alicePage.locator('[data-testid^="bet-row-"]').first(),
  ).toBeVisible();

  // Started at £100, staked £10 → £90 held until settlement.
  await expect(alicePage.getByTestId('balance')).toHaveText('Balance: £90.00');

  await aliceCtx.close();
});
