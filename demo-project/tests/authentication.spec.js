const { test, expect } = require('@playwright/test');

// Fills the Meridian login form and waits for the workspace to load.
async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('signs in with email and password', async ({ page }) => {
    await page.getByLabel('Email').fill('analyst@meridian.io');
    await page.getByLabel('Password').fill('Correct-Horse-9');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible();
  });

  test('rejects an invalid password with an inline error', async ({ page }) => {
    await page.getByLabel('Email').fill('analyst@meridian.io');
    await page.getByLabel('Password').fill('nope-not-it');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
    await expect(page).toHaveURL('/login');
  });

  test('sends a password-reset email', async ({ page }) => {
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await page.getByLabel('Email').fill('analyst@meridian.io');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Check your inbox for a reset link.')).toBeVisible();
  });

  test('signs the user out and clears the session', async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
    await page.getByTestId('user-menu').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');
    // the protected route must bounce back to login once the session cookie is gone
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('enforces MFA for owner accounts', async ({ page }) => {
    await page.getByLabel('Email').fill('owner@meridian.io');
    await page.getByLabel('Password').fill('Correct-Horse-9');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/login/mfa');
    await page.getByLabel('Authentication code').fill('421903');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('lands on the workspace after the SSO callback', async ({ page }) => {
    // return from the identity provider carrying the signed SAML assertion
    await page.goto('/sso/callback?SAMLResponse=okta_9f2a1c&RelayState=%2Fdashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Meridian · Workspace/);
  });

  test('keeps the session valid across two open tabs', async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
    // open a second tab in the same context; it shares the session cookie
    const second = await page.context().newPage();
    await second.goto('/reports');
    const res = await second.request.get('/api/v2/session');
    expect(res.status()).toBe(200);
    await expect(second.getByTestId('session-badge')).toHaveText('Signed in');
  });
});
