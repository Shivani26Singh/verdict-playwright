const { test, expect } = require('@playwright/test');

async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Correct-Horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'analyst@meridian.io');
  });

  test('creates a task with an assignee and due date', async ({ page }) => {
    await page.goto('/projects/prj_atlas/board');
    await page.getByRole('button', { name: 'New task' }).click();
    await page.getByLabel('Title').fill('Draft the onboarding email');
    await page.getByLabel('Assignee').selectOption('jordan@meridian.io');
    await page.getByLabel('Due date').fill('2026-08-15');
    await page.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByRole('article', { name: 'Draft the onboarding email' })).toBeVisible();
  });

  test('moves a task across board columns', async ({ page }) => {
    await page.goto('/projects/prj_atlas/board');
    const card = page.getByRole('article', { name: 'Review Q2 metrics' });
    await card.getByRole('button', { name: 'Move to' }).click();
    await page.getByRole('menuitem', { name: 'In progress' }).click();
    await expect(page.getByTestId('column-in-progress').getByRole('article', { name: 'Review Q2 metrics' })).toBeVisible();
  });

  test('adds a comment and @mentions a teammate', async ({ page }) => {
    await page.goto('/projects/prj_atlas/tasks/tsk_1042');
    await page.getByRole('textbox', { name: 'Add a comment' }).fill('Great progress here @');
    await page.getByRole('option', { name: 'Priya Nair' }).click();
    await page.getByRole('button', { name: 'Comment' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: '@Priya Nair' })).toBeVisible();
  });

  test('bulk-closes completed tasks', async ({ page }) => {
    await page.goto('/projects/prj_atlas/tasks');
    await page.getByRole('checkbox', { name: 'Select all done' }).check();
    await page.getByRole('button', { name: 'Close selected' }).click();
    await page.getByRole('button', { name: 'Close 4 tasks' }).click();
    await expect(page.getByRole('status')).toHaveText('4 tasks closed');
  });

  test('filters tasks by label and assignee', async ({ page }) => {
    await page.goto('/projects/prj_atlas/tasks');
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.getByRole('checkbox', { name: 'Label: bug' }).check();
    await page.getByLabel('Assignee').selectOption('me');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByTestId('task-row')).toHaveCount(3);
  });

  test('reorders a task via drag and drop', async ({ page }) => {
    await page.goto('/projects/prj_atlas/board');
    const source = page.getByRole('article', { name: 'Ship changelog' });
    const target = page.getByRole('article', { name: 'Update docs' });
    await source.dragTo(target);
    // the dragged card should settle at the top of the To do column
    await expect(page.getByTestId('column-todo').getByRole('article').first()).toHaveText(/Ship changelog/);
  });
});
