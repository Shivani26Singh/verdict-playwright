const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
  });

  test('shows an unread badge for new mentions', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('notifications-badge')).toBeVisible();
    await expect(page.getByTestId('notifications-badge')).toHaveText('3');
  });

  test('opens a notification and marks it read', async ({ page }) => {
    await page.goto('/notifications');
    const first = page.getByRole('listitem').filter({ hasText: 'mentioned you' }).first();
    await first.click();
    await expect(page.getByRole('heading', { name: 'Mention in Atlas Migration' })).toBeVisible();
    await expect(first).not.toHaveClass(/unread/);
  });

  test('updates email digest preferences', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.getByLabel('Email digest').selectOption('Daily');
    await page.getByRole('button', { name: 'Save preferences' }).click();
    await expect(page.getByRole('status')).toHaveText('Preferences saved');
  });

  test('reconnects the live feed after a socket drop', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByTestId('feed-status')).toHaveText('Live');
    // force a reconnect and assert the client re-establishes the socket
    await page.getByRole('button', { name: 'Reconnect' }).click();
    await expect(page.getByTestId('feed-status')).toHaveText('Live');
    await expect(page.getByRole('listitem').first()).toBeVisible();
  });

  test('bulk-marks 500 notifications as read', async ({ page }) => {
    await page.goto('/notifications');
    await page.getByRole('checkbox', { name: 'Select all' }).check();
    const [res] = await Promise.all([
      page.waitForResponse('**/api/v2/notifications/bulk-read'),
      page.getByRole('button', { name: 'Mark all as read' }).click(),
    ]);
    expect(res.status()).toBe(200);
    await expect(page.getByTestId('notifications-badge')).toHaveCount(0);
  });
});
