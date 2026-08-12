// Shared launch helper for the Salmon extension test driver.
// Uses bundled Playwright chromium per official docs (Chrome/Edge removed
// the extension side-load flags).
//
// Resolves Playwright dynamically: prefer locally installed `playwright`,
// fall back to the globally installed `@playwright/cli` shipped alongside the
// `playwright-cli` skill. Override with PLAYWRIGHT_PATH env var if needed.
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

async function resolveChromium() {
  if (process.env.PLAYWRIGHT_PATH) {
    return (await import(process.env.PLAYWRIGHT_PATH)).chromium;
  }
  try {
    return (await import('playwright')).chromium;
  } catch {
    // Fall through to global discovery
  }
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  const candidates = [
    path.join(globalRoot, '@playwright/cli/node_modules/playwright/index.mjs'),
    path.join(globalRoot, 'playwright/index.mjs'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return (await import(p)).chromium;
  }
  throw new Error(
    'Playwright not resolvable. Install `playwright` locally OR `@playwright/cli` globally OR set PLAYWRIGHT_PATH.'
  );
}
const chromium = await resolveChromium();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Path layout: this lib lives in apps/extension/.playwright/scripts/.
// `appRoot` is `apps/extension/`, `suiteRoot` is `apps/extension/.playwright/`.
export const suiteRoot = path.resolve(__dirname, '..');
export const appRoot = path.resolve(__dirname, '../..');
export const repoRoot = path.resolve(__dirname, '../../../..');
export const extDist = path.join(appRoot, 'dist/chrome-mv3');
export const profileDir = path.join(suiteRoot, 'profiles');
export const screensRoot = path.join(suiteRoot, 'screenshots');
export const snapsRoot = path.join(suiteRoot, 'snapshots');
export const reportsRoot = path.join(suiteRoot, 'reports');
export const fixturesRoot = path.join(suiteRoot, 'fixtures');

/**
 * Wait until a button matching `name` is both present and enabled, or timeout.
 * Critical for Salmon's async address validation, scan results, etc.
 */
export async function waitForButtonEnabled(page, name, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.count()) {
      const enabled = await btn.isEnabled().catch(() => false);
      if (enabled) return true;
    }
    await sleep(400);
  }
  return false;
}

/**
 * Write a report to .playwright/reports/<name>.md (auto-creates dir).
 */
export function writeReport(name, body) {
  fs.mkdirSync(reportsRoot, { recursive: true });
  fs.writeFileSync(path.join(reportsRoot, name), body);
}

export async function launch() {
  if (!fs.existsSync(extDist)) throw new Error('Missing extension dist at ' + extDist);
  fs.mkdirSync(profileDir, { recursive: true });

  const ctx = await chromium.launchPersistentContext(profileDir, {
    channel: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: [
      `--disable-extensions-except=${extDist}`,
      `--load-extension=${extDist}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 30000 });
  const extId = sw.url().split('/')[2];

  return { ctx, sw, extId };
}

export async function capture(page, folder, name) {
  const sDir = path.join(screensRoot, folder);
  const yDir = path.join(snapsRoot, folder);
  fs.mkdirSync(sDir, { recursive: true });
  fs.mkdirSync(yDir, { recursive: true });
  await page.screenshot({ path: path.join(sDir, name + '.png'), fullPage: true });
  const aria = await page
    .locator('body')
    .ariaSnapshot()
    .catch(() => '');
  fs.writeFileSync(path.join(yDir, name + '.yml'), aria);
  const text = await page
    .locator('body')
    .innerText()
    .catch(() => '');
  fs.writeFileSync(path.join(yDir, name + '.txt'), text);
  console.log('captured ' + folder + '/' + name);
}

export function tapConsole(page, label) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('[' + label + '] ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('[' + label + ' pageerror] ' + e.message));
  return errors;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Secrets loaded from .playwright/.env.test (gitignored). Never inline.
function loadSecrets() {
  const envPath = path.resolve(__dirname, '../.env.test');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Missing .playwright/.env.test — copy .env.test.example and fill in test seeds'
    );
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}
export const SECRETS = loadSecrets();
const PASSWORD = SECRETS.SALMON_TEST_PASSWORD;
const SEED_A = SECRETS.SALMON_TEST_SEED_A;
export const SEED_B = SECRETS.SALMON_TEST_SEED_B;
if (!PASSWORD || !SEED_A || !SEED_B) {
  throw new Error(
    'Incomplete .playwright/.env.test — need SALMON_TEST_PASSWORD, SALMON_TEST_SEED_A, SALMON_TEST_SEED_B'
  );
}

export async function openPopup(ctx, extId) {
  const popupUrl = `chrome-extension://${extId}/popup.html`;
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 360, height: 600 });
  await page.goto(popupUrl);
  await sleep(2500);
  return page;
}

export async function unlockOrRecover(page) {
  const pw = page.getByTestId('lock-password-input').first();
  if (await pw.count()) {
    await pw.fill(PASSWORD);
    await page.getByTestId('lock-unlock-button').click();
    await sleep(3000);
    return 'unlocked';
  }
  // Onboarding state
  const recoverBtn = page.getByTestId('select-recover-button');
  if (await recoverBtn.count()) {
    await recoverBtn.click();
    await sleep(1500);
    await page.getByTestId('recover-seed-input').fill(SEED_A);
    await sleep(500);
    await page.getByTestId('recover-next-button').click();
    await sleep(1500);
    await page.getByTestId('password-input').fill(PASSWORD);
    await page.getByTestId('password-confirm-input').fill(PASSWORD);
    await sleep(500);
    await page.getByTestId('password-submit-button').click();
    await sleep(4000);
    // Success → Go to my Account
    const goAcct = page.getByTestId('success-go-to-wallet-button');
    if (await goAcct.count()) {
      await goAcct.click();
      await sleep(2500);
    }
    return 'recovered';
  }
  return 'home';
}

export async function waitHome(page) {
  await page
    .getByTestId('home-screen')
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});
  await sleep(1500);
}

export async function clickBack(page) {
  // Strategy: find back arrow which is typically the first button in the
  // top-left of a sub-page. Try aria/label first, then fallback.
  const aria = page.getByRole('button', { name: /^(back|go back)$/i }).first();
  if (await aria.count()) {
    await aria.click().catch(() => {});
    return true;
  }
  // Fallback: button containing only an img with name "Back"
  const imgBack = page
    .locator('button')
    .filter({ has: page.locator('img[alt*="back" i], img[alt*="arrow" i]') })
    .first();
  if (await imgBack.count()) {
    await imgBack.click().catch(() => {});
    return true;
  }
  return false;
}
