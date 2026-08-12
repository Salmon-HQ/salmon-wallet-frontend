/**
 * Accessibility smoke (axe-core) for the extension popup. Scans the main
 * surfaces reachable from home — home itself, the receive sheet and the
 * settings drawer — against WCAG 2.0/2.1 A + AA rules.
 *
 * Gate policy: fails only on `critical` violations (the worst, rarely false-
 * positive: broken ARIA, missing labels on controls, etc.). The full violation
 * list (including `serious`/`moderate`, e.g. colour-contrast nits) is attached
 * to the test report for triage rather than blocking the suite on day one.
 * Tighten the threshold in this file as violations are burned down.
 *
 * Automated axe catches ~30-40% of WCAG issues — this complements, not
 * replaces, manual keyboard/screen-reader checks. Skips when salmon-api is
 * unreachable, matching the other live specs.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

async function scan(page: Page, surface: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  await test.info().attach(`axe-${surface}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const critical = results.violations.filter((v) => v.impact === 'critical');
  const summary = critical.map((v) => `${v.id} (${v.nodes.length})`).join(', ');
  expect(critical, `${surface} critical a11y violations: ${summary}`).toEqual([]);
}

test('home, receive and settings have no critical a11y violations', async ({ popup }) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');

  await unlockOrRecover(popup);
  await waitHome(popup);
  await scan(popup, 'home');

  // Receive sheet
  await popup.getByTestId('home-receive-button').click();
  await popup
    .getByTestId('receive-sheet')
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {});
  await scan(popup, 'receive');
  await popup
    .getByTestId('sheet-close-button')
    .click()
    .catch(() => {});

  // Settings drawer (menu only — no secret panels)
  await popup.getByTestId('wallet-header-settings-button').click();
  await popup
    .getByTestId('settings-item-accounts')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  await scan(popup, 'settings');
});
