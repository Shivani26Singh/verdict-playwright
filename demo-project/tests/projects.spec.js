const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'manager@meridian.io');
  });

  test('creates a project from a template', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByRole('option', { name: 'Marketing analytics template' }).click();
    await page.getByLabel('Project name').fill('Q3 Campaign Insights');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/\/projects\/prj_/);
    await expect(page.getByRole('heading', { name: 'Q3 Campaign Insights' })).toBeVisible();
  });

  test('renames a project inline', async ({ page }) => {
    await page.goto('/projects');
    const row = page.getByRole('row', { name: 'Atlas Migration' });
    await row.getByRole('button', { name: 'Rename' }).click();
    await row.getByRole('textbox').fill('Atlas Migration 2026');
    await row.getByRole('textbox').press('Enter');
    await expect(page.getByRole('row', { name: 'Atlas Migration 2026' })).toBeVisible();
  });

  test('filters the project list by status', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Status' }).click();
    await page.getByRole('checkbox', { name: 'Active' }).check();
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByTestId('project-row')).toHaveCount(6);
  });

  test('moves a project into a folder', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('row', { name: 'Beacon Reporting' }).getByRole('button', { name: 'Move' }).click();
    await page.getByRole('dialog').getByRole('treeitem', { name: 'Client Work' }).click();
    await page.getByRole('button', { name: 'Move here' }).click();
    await expect(page.getByRole('status')).toHaveText('Moved to Client Work');
    await page.getByRole('treeitem', { name: 'Client Work' }).click();
    await expect(page.getByRole('row', { name: 'Beacon Reporting' })).toBeVisible();
  });

  test('restores an archived project', async ({ page }) => {
    await page.goto('/projects?filter=archived');
    await page.getByRole('row', { name: 'Legacy Dashboards' }).getByRole('button', { name: 'Restore' }).click();
    await page.getByRole('button', { name: 'Confirm restore' }).click();
    await expect(page.getByRole('status')).toHaveText('Project restored');
    await page.goto('/projects');
    await expect(page.getByRole('row', { name: 'Legacy Dashboards' })).toBeVisible();
  });

  test('shows the archived banner after archiving a project', async ({ page }) => {
    await page.goto('/projects/prj_atlas');
    await page.getByRole('button', { name: 'Project actions' }).click();
    await page.getByRole('menuitem', { name: 'Archive project' }).click();
    await page.getByRole('button', { name: 'Archive' }).click();
    // the confirmation banner slides in with a CSS transition once archiving completes
    await expect(page.getByRole('status', { name: 'Project archived' })).toBeVisible();
  });

  test('opens the editor for a single selected row', async ({ page }) => {
    await page.goto('/projects');
    // open the editor for the Acme project from its list row
    await page.getByRole('row', { name: /Acme/ }).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit project' })).toBeVisible();
  });

  test('shows a friendly page for a deleted project deep link', async ({ page }) => {
    await page.goto('/projects/prj_9f2a41');
    // a removed project should land on the friendly empty-state, not a raw error
    await expect(page.getByRole('heading', { name: 'This project has moved' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to projects' })).toBeVisible();
  });
});
