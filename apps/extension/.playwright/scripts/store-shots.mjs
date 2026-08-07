// Throwaway: capture Chrome Web Store screenshots (1280x800) — do not commit.
import fs from 'node:fs';
import path from 'node:path';
import {
  launch, sleep, unlockOrRecover, waitHome, waitForButtonEnabled, repoRoot,
} from './lib.mjs';

const outDir = path.join(repoRoot, 'store-assets/chrome-web-store/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const { ctx, extId } = await launch();
console.log('extId=' + extId);

const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

async function toHome() {
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await sleep(2500);
  await unlockOrRecover(page);
  const decline = page.getByTestId('analytics-consent-decline');
  if (await decline.count()) {
    await decline.click().catch(() => {});
    await sleep(2000);
  }
  // SPA retains last tab across reloads — force Home tab
  const homeTab = page.getByTestId('tab-home');
  if (await homeTab.count()) {
    await homeTab.click().catch(() => {});
    await sleep(1500);
  }
  await waitHome(page);
}

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('shot ' + name);
}

async function step(name, fn) {
  try { await fn(); } catch (e) { console.log('SKIP ' + name + ': ' + e.message.split('\n')[0]); }
}

// 01 home
await toHome();
await sleep(6000); // let balances/images load
await shot('01-home.png');

// 02 swap — select receive token + amount so a real pair/quote shows
await step('swap', async () => {
  await page.getByTestId('tab-swap').click({ timeout: 8000 });
  await sleep(4000);
  const select = page.getByRole('button', { name: 'Select token: Select' }).first();
  if (await select.count()) {
    await select.click({ timeout: 8000 });
    await sleep(2000);
    await page.getByRole('textbox', { name: /search/i }).fill('USDC');
    await sleep(3000);
    const usdc = page.getByRole('button', { name: /^Select USDC/i }).first();
    if (await usdc.count()) {
      await usdc.click({ timeout: 8000 });
    } else {
      await page.getByRole('button', { name: /USD Coin/i }).first().click({ timeout: 8000 });
    }
    await sleep(3000);
  }
  // set an amount via 50% shortcut to fetch a quote (never executed)
  const half = page.getByRole('button', { name: /^50%$/i }).first();
  if (await half.count()) {
    await half.click();
    await waitForButtonEnabled(page, /review/i, 20000);
    await sleep(2000);
  }
  await shot('02-swap.png');
});

// 03 collectibles
await step('collectibles', async () => {
  await page.getByTestId('tab-collectibles').click({ timeout: 8000 });
  await sleep(6000);
  await shot('03-collectibles.png');
});

// 04 activity
await toHome();
await step('activity', async () => {
  await page.getByTestId('home-activity-button').click({ timeout: 8000 });
  await sleep(6000);
  await shot('04-transactions.png');
});

// 05 settings — open from Home so backdrop is the wallet view
await toHome();
await step('settings', async () => {
  await page.getByTestId('wallet-header-settings-button').click({ timeout: 8000 });
  await sleep(2500);
  await shot('05-settings.png');
});

await ctx.close();
process.exit(0);
