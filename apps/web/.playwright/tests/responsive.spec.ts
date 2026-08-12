/**
 * Responsive smoke for the web app home screen. Unlocks (or recovers) the test
 * wallet, then resizes the viewport across the standard breakpoints and asserts
 * the home screen stays visible with no horizontal overflow (the most common,
 * deterministic responsive regression).
 *
 * Runs on a single engine (layout reflow is engine-agnostic and recovery is
 * slow). Needs SALMON_TEST_PASSWORD + SALMON_TEST_SEED_A in .env.test and a
 * reachable salmon-api; skips otherwise.
 */
import { test, expect } from '@playwright/test';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('home has no horizontal overflow across breakpoints', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'responsive layout check runs on one engine');
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'SALMON_TEST_SEED_A not set in .env.test');

  await page.goto('/');
  await unlockOrRecover(page);
  await waitHome(page);
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 20_000 });

  for (const bp of BREAKPOINTS) {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(400); // let layout settle

    await expect(page.getByTestId('home-screen'), `home hidden at ${bp.name}`).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(
      overflow,
      `horizontal overflow at ${bp.name} (${bp.width}px): ${overflow}px`
    ).toBeLessThanOrEqual(1);

    await testInfo.attach(`home-${bp.name}-${bp.width}.png`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
});
