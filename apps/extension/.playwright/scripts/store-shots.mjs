// Chrome Web Store source captures, from the side panel — the extension's real
// surface (spec 028). Writes raw panel-sized PNGs to
// store-assets/source/extension-staged/; store-assets/compose.py frames them.
//
//   node store-shots.mjs            # store default mode (dark)
//   MODE=light node store-shots.mjs
//
// Wallet A from .env.test, on a fresh profile, against the staging proxy
// (store-assets/staging): build the extension with
// VITE_API_URL=http://127.0.0.1:3900 first. Nothing here signs: the Swap shot
// stops on its review, the signing shot closes the request unanswered.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, sleep, unlockOrRecover, waitHome, repoRoot } from './lib.mjs';

const outDir = path.join(repoRoot, 'store-assets/source/extension-staged');
fs.mkdirSync(outDir, { recursive: true });

// The side panel's real footprint: Chrome opens it ~360–400px wide, full height.
const PANEL = { width: 400, height: 800 };
const MODE = process.env.MODE ?? 'dark';
// A dApp on a domain Salmon owns, so no third party's name is on an approval.
const DAPP = 'https://demo.salmonwallet.io/';
const MESSAGE =
  'Sign in to Salmon Demo\n\nThis request only proves that you own this wallet. It costs nothing and moves no funds.\n\nNonce: 7f3a9c21';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'salmon-store-shots-'));
const { ctx, extId } = await launch({ profile, headless: true });
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
    .click({ timeout: 5_000 })
    .catch(() => {});
  // The consent screen's close mark is the header's back button; the header's
  // own testID sits on its container.
  await page
    .getByTestId('analytics-consent-screen')
    .getByTestId('screen-header-back-button')
    .click({ timeout: 10_000 })
    .catch(() => {});
  await waitHome(page);
  await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30_000 });
  await sleep(1500);
}

async function shot(name, target = page) {
  await target.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('shot ' + name);
}

async function openCatalog() {
  await page.getByTestId('powerups-fab').click({ timeout: 8000 });
  await page.getByTestId('powerups-row-toggle-payments').waitFor({ timeout: 20_000 });
  await sleep(1500);
}

async function closeCatalog() {
  await page.getByRole('button', { name: /^(back|go back)$/i }).first().click();
  await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 20_000 });
  await sleep(1500);
}

const approvalWindow = () =>
  ctx.waitForEvent('page', { predicate: (p) => p.url().includes('popup.html#'), timeout: 30_000 });

// Approve arms once the pointer has moved over the window and onto the button.
async function approve(window) {
  const button = window.getByTestId('dapp-approve-button');
  for (let i = 0; i < 60; i++) {
    await window.mouse.move(100, 200);
    await window.mouse.move(140, 260);
    await button.hover();
    if (await button.isEnabled()) return button.click();
    await sleep(500);
  }
  throw new Error('Approve never armed');
}

// Home carries Payments, never Swap: the same Home as the phone decks. Memo
// is not offered on mainnet, so it is not installed.
await toHome();
await openCatalog();
await page.getByTestId('powerups-row-toggle-payments').click();
await sleep(1000);
await closeCatalog();

// 01 home — Portfolio, balances and logos loaded
await sleep(5000);
await shot('01-home.png');

// 03 powerups — the catalogue page, before Swap is added
await openCatalog();
await shot('03-powerups.png');
await page.getByTestId('powerups-row-toggle-swap').click();
await sleep(1000);
await closeCatalog();

// 02 swap — 0.01 SOL, within what the demo wallet really holds; review only
await page.getByRole('tab', { name: /^Swap$/ }).click({ timeout: 8000 });
await page.getByTestId('swap-amount-input').fill('0.01', { timeout: 20_000 });
await page.getByTestId('swap-submit-button').click();
await page.getByTestId('confirmation-details-card').waitFor({ timeout: 60_000 });
await sleep(1500);
await shot('02-swap.png');
await page.getByTestId('confirmation-back-button').click();
await sleep(1500);

// 04 sign — a sign-in message from a connected dApp; closed unanswered
await ctx.route(`${DAPP}**`, (route) =>
  route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Salmon Demo</title><h1>Salmon Demo</h1>',
  })
);
const dapp = await ctx.newPage();
await dapp.goto(DAPP);
await dapp.waitForFunction(() => 'salmon' in window, null, { timeout: 20_000 });
let pending = approvalWindow();
await dapp.evaluate(() => {
  window.__connect = window.salmon.connect();
});
const connectWindow = await pending;
await sleep(2000);
await unlockOrRecover(connectWindow);
await approve(connectWindow);
await dapp.evaluate(() => window.__connect);
pending = approvalWindow();
await dapp.evaluate((text) => {
  window.__sign = window.salmon.signMessage(new TextEncoder().encode(text)).catch(() => null);
}, MESSAGE);
const signWindow = await pending;
await signWindow.setViewportSize(PANEL);
await signWindow.emulateMedia({ colorScheme: MODE });
// An approval window asks for the password on its own.
await sleep(2000);
await unlockOrRecover(signWindow);
await signWindow.getByTestId('dapp-sign-message-approval').waitFor({ timeout: 20_000 });
// The message itself in view, and Sign armed the way a person arms it (the
// pointer over the window, then onto the button), never pressed.
await signWindow.getByTestId('raw-message').scrollIntoViewIfNeeded();
const sign = signWindow.getByTestId('dapp-approve-button');
for (let i = 0; i < 40 && !(await sign.isEnabled()); i++) {
  await signWindow.mouse.move(100, 200);
  await signWindow.mouse.move(140, 260);
  await sign.hover();
  await sleep(500);
}
await sleep(1500);
await shot('04-sign.png', signWindow);
await signWindow.close();
await dapp.close();

// 05 send — the review of 0.5 SOL to a .sns name
await toHome();
await page.getByTestId('home-send-button').click({ timeout: 8000 });
await page.getByTestId('send-recipient-input').fill(process.env.RECIPIENT ?? 'salmonwallet.sns', { timeout: 20_000 });
await page.getByTestId('send-continue-button').click({ timeout: 30_000 });
await page.getByTestId('send-amount-input').fill('0.5', { timeout: 20_000 });
await page.getByTestId('send-review-button').click({ timeout: 20_000 });
await page.getByTestId('send-review-screen').waitFor({ timeout: 30_000 });
await sleep(3000);
await shot('05-send.png');

await ctx.close();
fs.rmSync(profile, { recursive: true, force: true });
process.exit(0);
