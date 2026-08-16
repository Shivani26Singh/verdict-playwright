const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Administration', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin@meridian.io');
  });

  test('configures SSO with a SAML metadata URL', async ({ page }) => {
    await page.goto('/admin/sso');
    await page.getByLabel('SAML metadata URL').fill('https://idp.okta.com/app/meridian/sso/saml/metadata');
    await page.getByRole('button', { name: 'Fetch metadata' }).click();
    await expect(page.getByTestId('sso-certificate')).toContainText('Valid until');
    await page.getByRole('button', { name: 'Enable SSO' }).click();
    await expect(page.getByTestId('sso-status')).toHaveText('Enabled');
  });

  test('sets the workspace data-retention window', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByLabel('Data retention').selectOption('90 days');
    await page.getByRole('button', { name: 'Save retention policy' }).click();
    await expect(page.getByRole('status')).toHaveText('Retention policy updated');
  });

  test('filters the audit log by actor and action', async ({ page }) => {
    await page.goto('/admin/audit');
    await page.getByLabel('Actor').fill('owner@meridian.io');
    await page.getByLabel('Action').selectOption('project.deleted');
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByTestId('audit-row').first()).toContainText('project.deleted');
  });

  test('exports the audit log as the workspace owner', async ({ page }) => {
    await page.goto('/admin/audit');
    const [res] = await Promise.all([
      page.waitForResponse('**/api/v2/audit/export'),
      page.getByRole('button', { name: 'Export audit log' }).click(),
    ]);
    // the export is queued behind a step-up MFA session
    expect(res.status()).toBe(202);
    await expect(page.getByRole('status')).toHaveText('Export started');
  });
});
