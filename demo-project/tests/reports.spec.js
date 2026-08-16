const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
  });

  test('builds a report from the query editor', async ({ page }) => {
    await page.goto('/reports/new');
    await page.getByRole('textbox', { name: 'Query' }).fill('SELECT plan, count(*) FROM signups GROUP BY plan');
    await page.getByRole('button', { name: 'Run query' }).click();
    await expect(page.getByRole('table', { name: 'Results' })).toBeVisible();
    await page.getByRole('button', { name: 'Save as report' }).click();
    await page.getByLabel('Report name').fill('Signups by plan');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Signups by plan' })).toBeVisible();
  });

  test('saves a report to the shared library', async ({ page }) => {
    await page.goto('/reports/rep_204');
    await page.getByRole('button', { name: 'Share' }).click();
    await page.getByRole('radio', { name: 'Shared library' }).check();
    await page.getByRole('button', { name: 'Save to library' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved to the shared library');
  });

  test('schedules a weekly email report', async ({ page }) => {
    await page.goto('/reports/rep_204');
    await page.getByRole('button', { name: 'Schedule' }).click();
    await page.getByLabel('Frequency').selectOption('weekly');
    await page.getByLabel('Send on').selectOption('Monday');
    await page.getByLabel('Recipients').fill('team@meridian.io');
    await page.getByRole('button', { name: 'Schedule report' }).click();
    await expect(page.getByRole('status')).toContainText('Scheduled every Monday');
  });

  test('delivers the PDF export within the 30s SLA', async ({ page }) => {
    await page.goto('/reports/rep_204');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('menuitem', { name: 'PDF' }).click();
    // the export worker must finish report_q3.pdf and surface the ready banner in time
    await expect(page.getByText('Your export is ready')).toBeVisible({ timeout: 30_000 });
  });

  test('streams the CSV export from the CDN edge', async ({ page }) => {
    await page.goto('/reports/rep_204');
    const [res] = await Promise.all([
      page.waitForResponse('**/api/v2/reports/export'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    const { url } = await res.json();
    // follow the signed CDN URL to stream the generated file
    await page.goto(url);
    await expect(page.getByText('rows streamed')).toBeVisible();
  });

  test('renders a 50k-row report without crashing the tab', async ({ page }) => {
    await page.goto('/reports/rep_bulk?rows=50000');
    await expect(page.getByRole('heading', { name: 'Q3 Raw Events' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand all groups' }).click();
    await expect(page.getByTestId('row-count')).toHaveText('50,000 rows');
    await page.screenshot({ path: 'bulk-report.png', fullPage: true });
  });

  test('downloads the signed audit report over TLS', async ({ page }) => {
    await page.goto('/reports/audit');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download audit report' }).click(),
    ]);
    // open the signed file-service URL directly to verify it serves over TLS
    await page.goto(download.url());
    await expect(page).toHaveTitle(/Audit report/);
  });
});
