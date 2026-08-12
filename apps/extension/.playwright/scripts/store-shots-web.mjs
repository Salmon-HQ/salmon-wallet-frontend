// Throwaway: Chrome Web Store screenshots (1280x800) from the web app, with a
// staged demo portfolio via route interception — do not commit.
import fs from 'node:fs';
import path from 'node:path';
import { sleep, repoRoot, SECRETS, waitForButtonEnabled } from './lib.mjs';
import { chromium } from 'playwright';

const BASE = process.env.SALMON_WEB_URL ?? 'http://localhost:4173';
const MOCK_DIR = process.env.MOCK_DIR;
const outDir = path.join(repoRoot, 'store-assets/chrome-web-store/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const mock = (f) => fs.readFileSync(path.join(MOCK_DIR, f), 'utf8');
const balanceBody = mock('mock-balance.json');
const txBody = mock('mock-transactions.json');
const nftBody = mock('mock-nfts.json');

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  locale: 'en-US',
});

// Staged demo portfolio: intercept the three data endpoints, leave prices,
// networks, swap quotes, and images live.
await ctx.route(/\/v1\/solana-mainnet\/account\/[^/]+\/balance/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: balanceBody })
);
await ctx.route(/\/v1\/solana-mainnet\/account\/[^/]+\/transactions(\?|$)/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: txBody })
);
await ctx.route(/\/v1\/solana-mainnet\/nft\?/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: nftBody })
);

const page = await ctx.newPage();

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('shot ' + name);
}
async function step(name, fn) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fn();
      return;
    } catch (e) {
      console.log((attempt === 2 ? 'SKIP ' : 'RETRY ') + name + ': ' + e.message.split('\n')[0]);
      if (attempt === 2) {
        await page
          .screenshot({ path: path.join(MOCK_DIR, 'fail-' + name + '.png') })
          .catch(() => {});
      }
      await sleep(3000);
    }
  }
}

// onboarding: recover with SEED_A (fresh context every run)
await page.goto(BASE);
await sleep(3000);
const recoverBtn = page.getByTestId('select-recover-button');
if (await recoverBtn.count()) {
  await recoverBtn.click();
  await sleep(1500);
  await page.getByTestId('recover-seed-input').fill(SECRETS.SALMON_TEST_SEED_A);
  await sleep(500);
  await page.getByTestId('recover-next-button').click({ timeout: 30000 });
  await sleep(1500);
  await page.getByTestId('password-input').fill(SECRETS.SALMON_TEST_PASSWORD);
  await page.getByTestId('password-confirm-input').fill(SECRETS.SALMON_TEST_PASSWORD);
  await page.getByTestId('password-submit-button').click();
  await page
    .getByTestId('analytics-consent-decline')
    .click({ timeout: 60000 })
    .catch(() => {});
  await page
    .getByTestId('success-go-to-wallet-button')
    .click({ timeout: 60000 })
    .catch(() => {});
}
await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30000 });
await sleep(10000); // balances + token logos

// 01 home
await shot('01-home.png');

// 02 swap — REAL flow on Wallet B (holds real funds; quote only, never executed)
await step('swap', async () => {
  const ctxB = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: 'en-US',
  });
  const pageB = await ctxB.newPage();
  try {
    await pageB.goto(BASE);
    await sleep(3000);
    await pageB.getByTestId('select-recover-button').click({ timeout: 15000 });
    await sleep(1500);
    await pageB.getByTestId('recover-seed-input').fill(SECRETS.SALMON_TEST_SEED_B);
    await sleep(500);
    await pageB.getByTestId('recover-next-button').click({ timeout: 30000 });
    await sleep(1500);
    await pageB.getByTestId('password-input').fill(SECRETS.SALMON_TEST_PASSWORD);
    await pageB.getByTestId('password-confirm-input').fill(SECRETS.SALMON_TEST_PASSWORD);
    await pageB.getByTestId('password-submit-button').click();
    await pageB
      .getByTestId('analytics-consent-decline')
      .click({ timeout: 60000 })
      .catch(() => {});
    await pageB
      .getByTestId('success-go-to-wallet-button')
      .click({ timeout: 60000 })
      .catch(() => {});
    await pageB.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30000 });
    await sleep(6000);
    await pageB.getByTestId('tab-swap').click({ timeout: 10000 });
    await sleep(4000);
    // receive token -> Solana (You Send defaults to the largest holding, USDC)
    const sel = pageB.getByRole('button', { name: 'Select token: Select' }).first();
    if (await sel.count()) {
      await sel.click({ timeout: 10000 });
      await sleep(2000);
      await pageB
        .getByRole('button', { name: /^Select Solana/i })
        .first()
        .click({ timeout: 10000 });
      await sleep(3000);
    }
    const half = pageB.getByRole('button', { name: '50%' }).first();
    await half.click({ timeout: 10000 });
    await waitForButtonEnabled(pageB, /review/i, 30000);
    await sleep(2500);
    await pageB.screenshot({ path: path.join(outDir, '02-swap.png'), fullPage: false });
    console.log('shot 02-swap.png');
  } finally {
    await ctxB.close();
  }
});

// 03 collectibles
await step('collectibles', async () => {
  await page.getByTestId('tab-collectibles').click({ timeout: 10000 });
  await sleep(8000); // NFT images
  await shot('03-collectibles.png');
});

// 04 activity
await step('activity', async () => {
  await page.getByTestId('tab-home').click({ timeout: 10000 });
  await sleep(2500);
  await page.getByTestId('home-activity-button').click({ timeout: 10000 });
  await sleep(6000);
  await shot('04-transactions.png');
});

// 05 settings (open over Home)
await step('settings', async () => {
  const back = page.getByRole('button', { name: /^(back|go back)$/i }).first();
  if (await back.count()) {
    await back.click().catch(() => {});
    await sleep(1500);
  }
  const homeTab = page.getByTestId('tab-home');
  if (await homeTab.count()) {
    await homeTab.click().catch(() => {});
    await sleep(2000);
  }
  await page.getByTestId('wallet-header-settings-button').click({ timeout: 10000 });
  await sleep(2500);
  await shot('05-settings.png');
});

await browser.close();
process.exit(0);
