const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
  });

  test('renders the acquisition funnel', async ({ page }) => {
    await page.goto('/analytics/funnel');
    await expect(page.getByRole('heading', { name: 'Acquisition funnel' })).toBeVisible();
    await expect(page.getByTestId('funnel-stage')).toHaveCount(4);
    await expect(page.getByTestId('funnel-stage').first()).toContainText('Visited');
  });

  test('drills into a cohort from the retention grid', async ({ page }) => {
    await page.goto('/analytics/retention');
    await page.getByRole('gridcell', { name: 'Week 3 · June cohort' }).click();
    await expect(page.getByRole('dialog', { name: 'Cohort detail' })).toBeVisible();
    await expect(page.getByTestId('cohort-size')).toContainText('users');
  });

  test('compares two date ranges side by side', async ({ page }) => {
    await page.goto('/analytics');
    await page.getByRole('button', { name: 'Compare' }).click();
    await page.getByLabel('Range A').fill('2026-06-01 – 2026-06-30');
    await page.getByLabel('Range B').fill('2026-07-01 – 2026-07-31');
    await page.getByRole('button', { name: 'Compare ranges' }).click();
    await expect(page.getByTestId('delta-badge')).toBeVisible();
  });

  test('exports a chart as PNG', async ({ page }) => {
    await page.goto('/analytics/funnel');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export as PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('acquisition-funnel.png');
  });

  test('reconciles funnel totals against the source dataset', async ({ page }) => {
    await page.goto('/analytics/funnel');
    const shown = await page.getByTestId('funnel-total').getAttribute('data-value');
    const res = await page.request.get('/api/v2/analytics/funnel/source');
    const source = await res.json();
    // the tile total must match the aggregate computed from the raw dataset
    expect({ funnelTotal: Number(shown) }).toEqual({ funnelTotal: source.total });
  });

  test('keeps the realtime metrics stream connected', async ({ page }) => {
    await page.goto('/analytics/live');
    await expect(page.getByTestId('stream-status')).toHaveText('Connected');
    // hold the stream open past the idle window and confirm it stays alive
    const res = await page.request.get('https://stream.meridian.io/v2/metrics', { timeout: 65_000 });
    expect(res.ok()).toBeTruthy();
    await expect(page.getByTestId('stream-status')).toHaveText('Connected');
  });

  test('loads the third-party benchmark feed', async ({ page }) => {
    await page.goto('/analytics/benchmarks');
    await page.getByRole('button', { name: 'Load industry benchmarks' }).click();
    // the widget opens the partner feed hosted on their CDN
    await page.goto('https://benchmarks.partner-cdn.io/v1/saas/2026');
    await expect(page.getByRole('heading', { name: 'Industry benchmarks' })).toBeVisible();
  });

  test('keeps cohort retention stable after a data backfill', async ({ page }) => {
    await page.goto('/analytics/retention');
    const res = await page.request.get('/api/v2/analytics/retention?cohort=week0');
    const { retention } = await res.json();
    // week-0 retention should hold near its historical baseline after the backfill
    expect(retention).toBeCloseTo(0.74, 2);
  });
});
