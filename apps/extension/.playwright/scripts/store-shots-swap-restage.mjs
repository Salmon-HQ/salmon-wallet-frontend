// Throwaway: re-shoot 02-swap.png only — real Jupiter quote on Wallet B,
// staged identity/balance coherent with 01-home. Do not commit.
import fs from 'node:fs';
import path from 'node:path';
import { sleep, SECRETS, waitForButtonEnabled } from './lib.mjs';
import { chromium } from 'playwright';

const BASE = process.env.SALMON_WEB_URL ?? 'http://localhost:4173';
const MOCK_DIR = process.env.MOCK_DIR;
const OUT = process.env.OUT_PNG;
const balanceBody = fs.readFileSync(path.join(MOCK_DIR, 'mock-balance.json'), 'utf8');

// Staged identity, must match 01-home.png exactly.
const ADDR_HEAD = '7Q3Hm2';
const ADDR_TAIL = '8Ras6n';
const AVATAR = 'https://static.salmonwallet.io/avatar/08.png'; // pixel-matched to 01-home
const REAL_USDC = '2.099709'; // Wallet B's real balance, shown if the mock doesn't feed the line
const STAGED_USDC = '5214.8';

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  locale: 'en-US',
});
// NO balance mock. Staging the balance endpoint feeds the swap screen wrong
// token metadata: the receive amount renders raw lamports with the send token's
// decimals (1.049854 USDC -> "14.262397 SOL" instead of "0.014146734 SOL").
// The quote itself is what this shot is selling, so it stays 100% untouched and
// the two staged strings (address, available) are patched display-only below.
void balanceBody;

const page = await ctx.newPage();
await page.goto(BASE);
await sleep(3000);
await page.getByTestId('select-recover-button').click({ timeout: 15000 });
await sleep(1500);
await page.getByTestId('recover-seed-input').fill(SECRETS.SALMON_TEST_SEED_B);
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
await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30000 });
await sleep(6000);

await page.getByTestId('tab-swap').click({ timeout: 10000 });
await sleep(4000);

// The staged balance makes SOL look like a large holding, so the send token can
// no longer be assumed to default to USDC. Assert it, and correct it if needed —
// a SOL send would exceed Wallet B's REAL balance and Jupiter would refuse to quote.
const tokenButtons = await page.getByRole('button', { name: /Select token:/ }).all();
const names = [];
for (const b of tokenButtons) names.push(await b.getAttribute('aria-label').catch(() => null));
console.log('token buttons:', JSON.stringify(names));

const sendBtn = page.getByRole('button', { name: /Select token:/ }).first();
const sendLabel = (await sendBtn.getAttribute('aria-label')) ?? '';
if (!/USDC/i.test(sendLabel)) {
  console.log('send token is not USDC (' + sendLabel + ') — selecting USDC');
  await sendBtn.click({ timeout: 10000 });
  await sleep(2000);
  await page
    .getByRole('button', { name: /^Select USD Coin|^Select USDC/i })
    .first()
    .click({ timeout: 10000 });
  await sleep(3000);
} else {
  console.log('send token already USDC');
}

// receive token -> Solana
const sel = page.getByRole('button', { name: 'Select token: Select' }).first();
if (await sel.count()) {
  await sel.click({ timeout: 10000 });
  await sleep(2000);
  await page
    .getByRole('button', { name: /^Select Solana/i })
    .first()
    .click({ timeout: 10000 });
  await sleep(3000);
}

// Live quote for ~1.05 USDC (within Wallet B's REAL balance — Jupiter Ultra
// rejects quotes above the taker's real holdings).
const sendInput = page.getByRole('textbox').first();
await sendInput.fill('1.049854');
const quoted = await waitForButtonEnabled(page, /review/i, 30000);
console.log('review enabled (live quote settled):', quoted);
await sleep(2500);

// Display-only staging. Re-applied after a pause because a background re-render
// would otherwise revert it; the patches are self-healing (they only match
// un-staged values).
async function stage() {
  return page.evaluate(
    ({ head, tail, avatar, real, staged }) => {
      const out = { address: 0, avatarImg: 0, avatarBg: 0, available: null, availablePatched: 0 };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);

      for (const n of texts) {
        const t = n.textContent.trim();
        // header address: 6 + separator + 6, keep the app's own separator glyph
        if (/^9mpJyg/.test(t) && t.length < 20) {
          n.textContent = head + t.slice(6, -6) + tail;
          out.address++;
        }
        // Available line: replace only the number, never the "Available:" label
        if (n.textContent.includes(real)) {
          n.textContent = n.textContent.replace(real, staged);
          out.availablePatched++;
        }
      }

      document.querySelectorAll('img').forEach((img) => {
        if (/\/avatar\/\d\d\.png/.test(img.src) && img.src !== avatar) {
          img.src = avatar;
          out.avatarImg++;
        }
      });
      document.querySelectorAll('div').forEach((el) => {
        const bg = el.style.backgroundImage || '';
        if (/\/avatar\/\d\d\.png/.test(bg) && !bg.includes(avatar)) {
          el.style.backgroundImage = `url("${avatar}")`;
          out.avatarBg++;
        }
      });

      // report the rendered Available line (RN splits label/value across nodes,
      // so read the enclosing element's innerText)
      for (const el of document.querySelectorAll('div,span')) {
        const t = (el.innerText || '').trim();
        if (/^Available:/.test(t) && t.length < 40) out.available = t;
      }
      return out;
    },
    { head: ADDR_HEAD, tail: ADDR_TAIL, avatar: AVATAR, real: REAL_USDC, staged: STAGED_USDC }
  );
}

const first = await stage();
console.log('stage pass 1:', JSON.stringify(first));
console.log(
  first.availablePatched > 0
    ? 'Available: DOM-patched (mock did not feed it)'
    : 'Available: fed by balance route mock'
);
await sleep(2500); // avatar image load
const second = await stage();
console.log('stage pass 2 (re-render repair):', JSON.stringify(second));
await sleep(1200);

await page.screenshot({ path: OUT, fullPage: false });
console.log('shot ' + OUT);
await browser.close();
process.exit(0);
