/**
 * Playwright test fixtures for the Salmon browser extension.
 *
 * Loads the built MV3 extension into a persistent Chromium profile and
 * exposes the extension id + an opened popup page. Replaces the legacy
 * launch()/openPopup() helpers from scripts/lib.mjs.
 */
import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTestEnv } from './env';

loadTestEnv();

const suiteRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(suiteRoot, '..');
const extDist = path.join(appRoot, 'dist/chrome-mv3');

type ExtensionOptions = {
  /** Which directory under `profiles/` to run in. */
  profileName: string;
  /**
   * Wipe the profile before launching. Needed by any spec that has to see
   * onboarding, or that asserts on once-per-install behavior — the analytics
   * `first_*` events burn a persisted flag, so a reused profile only ever
   * emits them once.
   */
  freshProfile: boolean;
};

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  popup: Page;
};

export const test = base.extend<ExtensionOptions & ExtensionFixtures>({
  profileName: ['default', { option: true }],
  freshProfile: [false, { option: true }],

  context: async ({ profileName, freshProfile }, use) => {
    if (!fs.existsSync(extDist)) {
      throw new Error(
        `Missing extension build at ${extDist}. Run: pnpm --filter @salmon/extension build`
      );
    }

    const profileDir = path.join(suiteRoot, 'profiles', profileName);
    if (freshProfile) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
    fs.mkdirSync(profileDir, { recursive: true });

    // Extensions cannot run in the legacy headless-shell, but Playwright's
    // bundled `chromium` channel (new headless mode) does support them —
    // that is what lets this suite run on a display-less CI runner.
    // Local runs stay headed by default; CI sets SALMON_E2E_HEADLESS=1.
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chromium',
      headless: process.env.SALMON_E2E_HEADLESS === '1',
      viewport: { width: 1280, height: 900 },
      args: [
        `--disable-extensions-except=${extDist}`,
        `--load-extension=${extDist}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 30_000 });
    }
    // chrome-extension://<id>/...
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },

  popup: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(page);
    await page.close();
  },
});

export { expect };
