const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
  });

  test('loads the default workspace dashboard', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible();
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
    await expect(page.getByTestId('kpi-active-users')).toBeVisible();
  });

  test('switches the active workspace from the picker', async ({ page }) => {
    await page.getByTestId('workspace-picker').click();
    await page.getByRole('option', { name: 'Northwind Labs' }).click();
    await expect(page).toHaveURL(/\/dashboard\?ws=northwind/);
    await expect(page.getByTestId('workspace-picker')).toHaveText('Northwind Labs');
  });

  test('filters KPI tiles by the last 7 days', async ({ page }) => {
    await page.getByRole('button', { name: 'Date range' }).click();
    await page.getByRole('menuitem', { name: 'Last 7 days' }).click();
    await expect(page.getByTestId('range-label')).toHaveText('Last 7 days');
    await expect(page.getByTestId('kpi-revenue')).toContainText('$');
  });

  test('pins a saved view to the sidebar', async ({ page }) => {
    await page.getByRole('button', { name: 'Save view' }).click();
    await page.getByLabel('View name').fill('Exec weekly');
    await page.getByRole('button', { name: 'Pin to sidebar' }).click();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Exec weekly' })).toBeVisible();
  });

  test('formats the revenue tile as localized currency', async ({ page }) => {
    // the KPI header renders the grouped revenue figure via Intl.NumberFormat
    await expect(page.getByTestId('kpi-revenue')).toHaveText('$1,284,300');
  });

  test('updates the live metrics widget on each tick', async ({ page }) => {
    const widget = page.getByTestId('live-metrics');
    await expect(widget).toBeVisible();
    // let the socket stream a handful of ticks, then reconcile view against store
    await expect(widget.getByTestId('tick-count')).toHaveText('8');
    const rendered = await widget.getByTestId('sparkline-latest').innerText();
    const store = await page.evaluate(() => String(window.__meridian.metrics.latest));
    expect(rendered).toBe(store);
  });

  test('renders the header when the profile payload is partial', async ({ page }) => {
    // SCIM-provisioned accounts can arrive without a displayName on /api/v2/me
    await expect(page.getByTestId('header-greeting')).toBeVisible();
    await expect(page.getByTestId('header-greeting')).toContainText('Welcome back');
  });
});
