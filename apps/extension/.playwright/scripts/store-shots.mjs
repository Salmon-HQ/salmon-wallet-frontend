// Chrome Web Store source captures, from the side panel — the extension's real
// surface (spec 028). Writes raw panel-sized PNGs to
// store-assets/source/extension-staged/; store-assets/compose.py frames them.
//
//   node store-shots.mjs            # store default mode (dark)
//   MODE=light node store-shots.mjs
//
// Wallet A from .env.test, live backend on 127.0.0.1:3001. No on-chain action.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, unlockOrRecover, waitHome, repoRoot } from './lib.mjs';

const outDir = path.join(repoRoot, 'store-assets/source/extension-staged');
fs.mkdirSync(outDir, { recursive: true });

// The side panel's real footprint: Chrome opens it ~360–400px wide, full height.
const PANEL = { width: 400, height: 800 };
const MODE = process.env.MODE ?? 'dark';

const { ctx, extId } = await launch();
const page = await ctx.newPage();
await page.setViewportSize(PANEL);
await page.emulateMedia({ colorScheme: MODE });

async function toHome() {
  await page.goto(`chrome-extension://${extId}/sidepanel.html`);
  await sleep(2500);
  await unlockOrRecover(page);
  // A fresh profile lands on Success, then the consent prompt, before Home.
  await page
    .getByTestId('success-go-to-wallet-button')
    .click({ timeout: 60_000 })
    .catch(() => {});
  await page
    .getByTestId('analytics-consent-decline')
    .click({ timeout: 10_000 })
    .catch(() => {});
  await waitHome(page);
  await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30_000 });
  await sleep(1500);
}

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('shot ' + name);
}

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    console.log('SKIP ' + name + ': ' + e.message.split('\n')[0]);
  }
}

// 01 home — Portfolio, balances and logos loaded
await toHome();
await sleep(6000);
await shot('01-home.png');

// 02 activity — opened from the Activity pill
await step('activity', async () => {
  await page.getByTestId('home-activity-button').click({ timeout: 8000 });
  await sleep(6000);
  await shot('02-transactions.png');
});

// 03 NFTs — the sub-tab; images need their time
await toHome();
await step('collectibles', async () => {
  await page.getByRole('tab', { name: /NFTs/i }).click({ timeout: 8000 });
  await sleep(8000);
  await shot('03-collectibles.png');
});

// 04 settings — the stack over Home
await toHome();
await step('settings', async () => {
  await page.getByTestId('wallet-header-settings-button').click({ timeout: 8000 });
  await sleep(2500);
  await shot('04-settings.png');
});

// 05 send — the recipient step, token chosen
await toHome();
await step('send', async () => {
  await page.getByTestId('home-send-button').click({ timeout: 8000 });
  await sleep(3000);
  await shot('05-send.png');
});

await ctx.close();
process.exit(0);
