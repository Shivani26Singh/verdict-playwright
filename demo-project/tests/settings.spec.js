const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin@meridian.io');
  });

  test('updates the workspace display name', async ({ page }) => {
    await page.goto('/settings');
    await page.getByLabel('Workspace name').fill('Meridian HQ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toHaveText('Workspace updated');
    await expect(page.getByTestId('workspace-name')).toHaveText('Meridian HQ');
  });

  test('connects a Slack integration', async ({ page }) => {
    await page.goto('/settings/integrations');
    await page.getByRole('button', { name: 'Connect Slack' }).click();
    await page.getByLabel('Slack workspace URL').fill('meridian-hq.slack.com');
    await page.getByRole('button', { name: 'Authorize' }).click();
    await expect(page.getByTestId('slack-status')).toHaveText('Connected');
  });

  test('regenerates a personal API token', async ({ page }) => {
    await page.goto('/settings/api-tokens');
    await page.getByRole('button', { name: 'Regenerate token' }).click();
    await page.getByRole('button', { name: 'Yes, regenerate' }).click();
    await expect(page.getByTestId('api-token')).toHaveText(/^mrd_[A-Za-z0-9]{32}$/);
  });

  test('persists the selected theme across a reload', async ({ page }) => {
    await page.goto('/settings/appearance');
    await page.getByRole('radio', { name: 'Dark' }).check();
    await page.reload();
    // the chosen theme must survive the reload via the committed --mode property
    await expect(page.locator(':root')).toHaveAttribute('data-theme', 'dark');
  });

  test('loads feature flags from the environment config', async ({ page }) => {
    await page.goto('/settings/labs');
    // experimental toggles are gated by flags fetched from the environment config
    await expect(page.getByTestId('flag-beta-dashboards')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Beta dashboards' })).toBeEnabled();
  });
});
