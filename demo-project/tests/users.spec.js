const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin@meridian.io');
    await page.goto('/admin/users');
  });

  test('lists members with their roles', async ({ page }) => {
    await expect(page).toHaveURL('/admin/users');
    await expect(page.getByRole('row', { name: 'owner@meridian.io' })).toContainText('Owner');
    await expect(page.getByTestId('member-row')).toHaveCount(12);
  });

  test('changes a member\'s role to manager', async ({ page }) => {
    const row = page.getByRole('row', { name: 'devon@meridian.io' });
    await row.getByRole('button', { name: 'Change role' }).click();
    await page.getByRole('menuitem', { name: 'Manager' }).click();
    await expect(row.getByTestId('role-badge')).toHaveText('Manager');
  });

  test('removes a member from the workspace', async ({ page }) => {
    const row = page.getByRole('row', { name: 'contractor@meridian.io' });
    await row.getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('button', { name: 'Remove member' }).click();
    await expect(page.getByRole('row', { name: 'contractor@meridian.io' })).toHaveCount(0);
  });

  test('resends a pending invitation', async ({ page }) => {
    await page.getByRole('tab', { name: 'Pending' }).click();
    await page.getByRole('row', { name: 'newhire@meridian.io' }).getByRole('button', { name: 'Resend' }).click();
    await expect(page.getByRole('status')).toHaveText('Invitation resent');
  });

  test('opens the invite dialog from the members toolbar', async ({ page }) => {
    await page.getByRole('button', { name: 'Invite members' }).click();
    await expect(page.getByRole('dialog', { name: 'Invite members' })).toBeVisible();
    await page.getByTestId('invite-email').fill('teammate@meridian.io');
    await page.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByRole('status')).toHaveText('Invitation sent');
  });

  test('blocks a non-admin from opening the admin console', async ({ page }) => {
    // re-authenticate as an analyst, who must be denied the admin console
    await signIn(page, 'analyst@meridian.io');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to dashboard' })).toBeVisible();
  });
});
