const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'billing-admin@meridian.io');
  });

  test('adds a payment method', async ({ page }) => {
    await page.goto('/billing/payment-methods');
    await page.getByRole('button', { name: 'Add payment method' }).click();
    await page.getByLabel('Card number').fill('4242 4242 4242 4242');
    await page.getByLabel('Expiry').fill('12/29');
    await page.getByLabel('CVC').fill('123');
    await page.getByRole('button', { name: 'Save card' }).click();
    await expect(page.getByText('Visa ending 4242')).toBeVisible();
  });

  test('upgrades from Team to Business', async ({ page }) => {
    await page.goto('/billing/plan');
    await page.getByRole('button', { name: 'Change plan' }).click();
    await page.getByRole('radio', { name: 'Business' }).check();
    await page.getByRole('button', { name: 'Review changes' }).click();
    await page.getByRole('button', { name: 'Confirm upgrade' }).click();
    await expect(page.getByTestId('current-plan')).toHaveText('Business');
  });

  test('applies a coupon at checkout', async ({ page }) => {
    await page.goto('/billing/checkout');
    await page.getByLabel('Promo code').fill('LAUNCH20');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('discount-line')).toContainText('-20%');
    await expect(page.getByTestId('order-total')).toContainText('$');
  });

  test('downloads a past invoice as PDF', async ({ page }) => {
    await page.goto('/billing/invoices');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('row', { name: 'June 2026' }).getByRole('button', { name: 'Download PDF' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/invoice-2026-06\.pdf/);
  });

  test('confirms a declined card after the customer re-enters CVC', async ({ page }) => {
    await page.goto('/billing/checkout');
    await page.getByLabel('CVC').fill('321');
    await page.getByRole('button', { name: 'Re-submit payment' }).click();
    // confirm only enables once the gateway re-authorizes the card
    await page.getByTestId('confirm-payment').click();
    await expect(page.getByRole('status')).toHaveText('Payment confirmed');
  });

  test('generates the monthly invoice for an enterprise plan', async ({ page }) => {
    await page.goto('/billing/invoices');
    const [res] = await Promise.all([
      page.waitForResponse('**/api/v2/billing/invoices'),
      page.getByRole('button', { name: 'Generate invoice' }).click(),
    ]);
    expect(res.status()).toBe(201);
    await expect(page.getByRole('status')).toHaveText('Invoice generated');
  });

  test('loads the subscription summary card', async ({ page }) => {
    await page.goto('/billing');
    // the summary card hydrates from the subscription endpoint
    await expect(page.getByTestId('subscription-card')).toBeVisible();
    await expect(page.getByTestId('subscription-card')).toContainText('Renews on');
  });
});
