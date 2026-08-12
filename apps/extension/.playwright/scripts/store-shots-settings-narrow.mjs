// Throwaway: re-shoot 05-settings.png at a narrow (phone-width) viewport so the
// settings drawer OVERLAYS the wallet column instead of sitting beside it, plus
// a layout probe of the other four screens at the same width. Do not commit.
import fs from 'node:fs';
import path from 'node:path';
import { sleep, SECRETS } from './lib.mjs';
import { chromium } from 'playwright';

const BASE = process.env.SALMON_WEB_URL ?? 'http://localhost:4173';
const MOCK_DIR = process.env.MOCK_DIR;
const OUT_DIR = process.env.OUT_DIR;
const W = Number(process.env.VIEWPORT_W ?? 430);
fs.mkdirSync(OUT_DIR, { recursive: true });

const mock = (f) => fs.readFileSync(path.join(MOCK_DIR, f), 'utf8');
const balanceBody = mock('mock-balance.json');
const txBody = mock('mock-transactions.json');
const nftBody = mock('mock-nfts.json');

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: W, height: 800 },
  deviceScaleFactor: 1,
  locale: 'en-US',
});
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
const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
  console.log('shot ' + name);
};

// onboarding: recover with SEED_A — same identity/avatar as 01-home.png
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
await sleep(10000);

// --- layout probe of the other four screens at this width ---
await shot('probe-01-home.png');
await page
  .getByTestId('tab-swap')
  .click({ timeout: 10000 })
  .catch(() => {});
await sleep(4000);
await shot('probe-02-swap.png');
await page
  .getByTestId('tab-collectibles')
  .click({ timeout: 10000 })
  .catch(() => {});
await sleep(8000);
await shot('probe-03-collectibles.png');
await page
  .getByTestId('tab-home')
  .click({ timeout: 10000 })
  .catch(() => {});
await sleep(2500);
await page
  .getByTestId('home-activity-button')
  .click({ timeout: 10000 })
  .catch(() => {});
await sleep(6000);
await shot('probe-04-transactions.png');

// back to home, open settings
const back = page.getByRole('button', { name: /^(back|go back)$/i }).first();
if (await back.count()) {
  await back.click().catch(() => {});
  await sleep(1500);
}
await page
  .getByTestId('tab-home')
  .click({ timeout: 10000 })
  .catch(() => {});
await sleep(2500);
await page.getByTestId('wallet-header-settings-button').click({ timeout: 10000 });
await sleep(2500);

// --- geometry probe: where does the drawer stop overlapping the wallet column? ---
const geom = async () =>
  page.evaluate(() => {
    const paper = document.querySelector('.MuiDrawer-paper');
    const home = document.querySelector('[data-testid="home-screen"]');
    const r = (el) =>
      el
        ? {
            l: Math.round(el.getBoundingClientRect().left),
            r: Math.round(el.getBoundingClientRect().right),
          }
        : null;
    return { w: window.innerWidth, drawer: r(paper), content: r(home) };
  });
const rows = [];
for (const width of [320, 375, 430, 600, 800, 1000, 1070, 1100, 1280]) {
  await page.setViewportSize({ width, height: 800 });
  await sleep(700);
  const g = await geom();
  const covered =
    g.drawer && g.content
      ? Math.max(0, Math.min(g.drawer.r, g.content.r) - Math.max(g.drawer.l, g.content.l))
      : 0;
  const contentW = g.content ? g.content.r - g.content.l : 0;
  rows.push(
    `${width}\tdrawer=${JSON.stringify(g.drawer)}\tcontent=${JSON.stringify(g.content)}\toverlap=${covered}/${contentW}px`
  );
}
console.log('--- GEOMETRY ---\n' + rows.join('\n'));

// final shot at the chosen width
await page.setViewportSize({ width: W, height: 800 });
await sleep(1500);

// Recovery assigns a random avatar, so pin it to the one 01-home.png/02-swap.png
// use (pixel-identical between those two, staged there as avatar/08.png).
// Self-healing: re-applied after a pause in case of a background re-render.
const AVATAR = 'https://static.salmonwallet.io/avatar/08.png';
const stageAvatar = () =>
  page.evaluate((avatar) => {
    let img = 0,
      bg = 0;
    document.querySelectorAll('img').forEach((el) => {
      if (/\/avatar\/\d\d\.png/.test(el.src) && el.src !== avatar) {
        el.src = avatar;
        img++;
      }
    });
    document.querySelectorAll('div').forEach((el) => {
      const b = el.style.backgroundImage || '';
      if (/\/avatar\/\d\d\.png/.test(b) && !b.includes(avatar)) {
        el.style.backgroundImage = `url("${avatar}")`;
        bg++;
      }
    });
    return { img, bg };
  }, AVATAR);
console.log('avatar pass 1:', JSON.stringify(await stageAvatar()));
await sleep(2500); // avatar image load
console.log('avatar pass 2:', JSON.stringify(await stageAvatar()));
await sleep(1200);

await shot('05-settings.png');

await browser.close();
process.exit(0);
