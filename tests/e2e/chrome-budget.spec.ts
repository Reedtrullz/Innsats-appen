import { expect, test } from '@playwright/test';

import { clearBrowserLocalState, createLocalMission } from './helpers';

// Chrome-height guardrail: the shell chrome (header, status line, boundary
// notice, mission shortcut) must leave the primary operational action
// reachable in the first viewport on a small phone — even on a cold start
// where nothing has been acknowledged yet. This regressed once before
// (status pills + boundary notice pushed all actions below the fold), so the
// budget is enforced here rather than re-reviewed by hand.
test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await clearBrowserLocalState(page);
});

test('home cold start keeps the first primary action in the first viewport', async ({ page }) => {
  await page.goto('/');
  const primaryAction = page.locator('[data-primary-actions="home"] a').first();
  await expect(primaryAction).toBeInViewport();
});

test('hurtigkort cold start keeps local search reachable without scrolling', async ({ page }) => {
  await page.goto('/hurtigkort');
  await expect(page.getByRole('heading', { name: 'Hurtigkort' })).toBeInViewport();
  await expect(page.locator('input[type="search"]')).toBeInViewport();
});

test('oppdrag keeps the continuous mission spine navigation in the first viewport', async ({ page }) => {
  await createLocalMission(page, {
    title: `Chrome-budsjett ${Date.now()}`,
    phase: 'under',
    scenario: 'flom',
    location: 'QA',
  });
  await expect(page.getByRole('navigation', { name: /Oppdragsflyt/i })).toBeInViewport();
});
