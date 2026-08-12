// Phase 1 walkthrough — full read-only sweep.
// Each surface wrapped in try/catch so a single failure doesn't kill the rest.
import {
  launch,
  capture,
  tapConsole,
  sleep,
  openPopup,
  unlockOrRecover,
  waitHome,
  clickBack,
  reportsRoot,
  fixturesRoot,
} from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const walletBPath = path.join(fixturesRoot, 'wallet-b-addr.txt');
const WALLET_B_ADDR = fs.existsSync(walletBPath) ? fs.readFileSync(walletBPath, 'utf8').trim() : '';

const allErrors = [];
const log = (m) => console.log('▶ ' + m);
async function step(name, fn) {
  try {
    log(name);
    await fn();
  } catch (e) {
    log('  ⚠ ' + name + ' failed: ' + e.message.split('\n')[0]);
  }
}

const { ctx, sw, extId } = await launch();
log('extId=' + extId);

const popup = await openPopup(ctx, extId);
allErrors.push(...tapConsole(popup, 'popup'));
const initState = await unlockOrRecover(popup);
log('init state=' + initState);
await waitHome(popup);
await capture(popup, 'home', '01-popup-home');

// Helper: ensure on home — click "Home" tab if visible, else click back until home
async function backHome() {
  for (let i = 0; i < 6; i++) {
    if (await popup.getByTestId('home-send-button').count()) return;
    if (!(await clickBack(popup))) {
      // try Close button (dialog X)
      const close = popup.getByRole('button', { name: /^Close$/i }).first();
      if (await close.count()) await close.click().catch(() => {});
    }
    await sleep(900);
  }
}

// === Bitcoin slide of carousel ===
await step('home — Bitcoin slide', async () => {
  const next = popup.getByTestId('balance-carousel-next').first();
  if (await next.count()) {
    await next.click({ timeout: 4000 }).catch(() => {});
    await sleep(2000);
    await capture(popup, 'home', '02-bitcoin-slide');
    const prev = popup.getByTestId('balance-carousel-prev').first();
    if (await prev.count()) {
      await prev.click({ timeout: 4000 }).catch(() => {});
      await sleep(1200);
    }
  }
});

await step('home — Collectibles tab', async () => {
  await popup.getByTestId('tab-collectibles').click({ timeout: 6000 });
  await sleep(2500);
  await capture(popup, 'home', '03-collectibles');
});

await step('home — Swap tab', async () => {
  await popup.getByTestId('tab-swap').click({ timeout: 6000 });
  await sleep(3500);
  await capture(popup, 'swap', '01-swap-tab');
});

let resetCount = 0;
async function gotoHomeTab() {
  resetCount++;
  await popup.goto('about:blank').catch(() => {});
  await sleep(300);
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await sleep(2500);
  await unlockOrRecover(popup);
  await waitHome(popup);
  await capture(popup, 'home', 'reset-' + resetCount);
  const sendBtnCount = await popup.getByTestId('home-send-button').count();
  log('  reset-' + resetCount + ' sendBtnCount=' + sendBtnCount + ' url=' + popup.url());
}

await step('back to Home tab', gotoHomeTab);

// === Receive ===
await step('Receive', async () => {
  await popup.getByTestId('home-receive-button').click({ timeout: 6000 });
  await sleep(2200);
  await capture(popup, 'receive', '01-receive-sheet');
});
await backHome();
await gotoHomeTab();

// === Activity ===
await step('Activity', async () => {
  await popup.getByTestId('home-activity-button').click({ timeout: 6000 });
  await sleep(2500);
  await capture(popup, 'activity', '01-activity');
});
await backHome();
await gotoHomeTab();

// === Send (no review) ===
await step('Send token list', async () => {
  await popup.getByTestId('home-send-button').click({ timeout: 6000 });
  await sleep(2500);
  await capture(popup, 'send', '01-token-list');
});

await step('Send → Solana form', async () => {
  const sol = popup.getByTestId('send-token-row-SOL').first();
  if (await sol.count()) {
    await sol.click();
    await sleep(2500);
    await capture(popup, 'send', '02-form');
    const recipient = popup.getByTestId('send-recipient-input');
    if (await recipient.count()) {
      if (WALLET_B_ADDR) await recipient.fill(WALLET_B_ADDR);
      await sleep(1000);
      await capture(popup, 'send', '03-recipient-filled');
    }
  }
});
await backHome();
await gotoHomeTab();
await backHome();
await gotoHomeTab(); // send is 2 levels deep

// === NFT (Collectibles) ===
await step('Collectibles list', async () => {
  await popup.getByTestId('tab-collectibles').click({ timeout: 6000 });
  await sleep(3000);
  await capture(popup, 'nft', '01-collectibles');
});

await step('NFT detail (first NFT)', async () => {
  // First clickable NFT card in the grid
  const cards = popup.locator('[class*="card"], button').filter({ has: popup.locator('img') });
  // Skip first few (they're tabs/headers); pick a candidate within the collectibles area
  const allHandles = await cards.elementHandles();
  for (const h of allHandles) {
    const txt = await h.innerText().catch(() => '');
    // NFT card text usually has the NFT name (not "Home"/"Send"/etc)
    if (txt && !/Home|Collectibles|Swap|Send|Receive|Activity/i.test(txt)) {
      await h.click().catch(() => {});
      await sleep(2500);
      // verify we navigated to detail
      if (!(await popup.getByTestId('home-send-button').count())) {
        await capture(popup, 'nft', '02-detail');
        break;
      }
    }
  }
});
await backHome();
await gotoHomeTab();

// === Settings ===
async function openSettings() {
  const gear = popup.getByTestId('wallet-header-settings-button').first();
  if (await gear.count()) {
    await gear.click({ timeout: 5000 }).catch(() => {});
    await sleep(1200);
    return (await popup.getByRole('dialog').count()) > 0;
  }
  return false;
}

await step('Settings dialog', async () => {
  const opened = await openSettings();
  log('  dialog opened=' + opened);
  await capture(popup, 'settings', '01-main');
});

const panels = [
  ['accounts', 'Accounts'],
  ['profile-picture', 'Profile Picture'],
  ['security', 'Security'],
  ['backup-seed', 'Backup Seed Phrase'],
  ['private-key', 'Private Key'],
  ['display-language', 'Display Language'],
  ['display-currency', 'Display Currency'],
  ['block-explorer', 'Block Explorer'],
  ['address-book', 'Address Book'],
  ['trusted-apps', 'Trusted Apps'],
];

for (const [slug, name] of panels) {
  await step('settings → ' + slug, async () => {
    // Each panel is a full page navigation — reset to home + re-open Settings.
    if (!(await popup.getByTestId('settings-item-accounts').count())) {
      await gotoHomeTab();
      await openSettings();
      await sleep(800);
    }
    const btn = popup.getByTestId('settings-item-' + slug).first();
    if (!(await btn.count())) throw new Error('panel button not found: ' + name);
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(300);
    await btn.click({ timeout: 8000, force: true });
    await sleep(2500);
    await capture(popup, 'settings', '02-' + slug);
  });
}

// === Developer Networks toggle (in Security or separate) ===
await step('settings → developer-networks', async () => {
  // Re-open settings if needed
  if (!(await popup.getByTestId('settings-item-accounts').count())) {
    const close = popup.getByTestId('settings-close-button').first();
    if (await close.count()) await close.click().catch(() => {});
    await sleep(500);
    await openSettings();
  }
  // scroll dialog
  await popup
    .evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (dlg) dlg.scrollTop = dlg.scrollHeight;
    })
    .catch(() => {});
  await sleep(500);
  await capture(popup, 'settings', '03-scrolled-bottom');
  // toggle the developer-networks switch by its stable test id
  const dev = popup.getByTestId('settings-developer-networks-toggle').first();
  if (await dev.count()) {
    await dev.click();
    await sleep(2000);
    await capture(popup, 'settings', '04-developer-networks');
  }
});

// close any open dialog
const closeFinal = popup.getByTestId('settings-close-button').first();
if (await closeFinal.count()) await closeFinal.click().catch(() => {});

// === Lock cycle ===
await step('Lock + unlock cycle', async () => {
  // open settings → Security → Lock if exists, else use storage to lock
  await openSettings();
  const sec = popup.getByTestId('settings-item-security').first();
  if (await sec.count()) {
    await sec.click();
    await sleep(1500);
    const lockBtn = popup.getByRole('button', { name: /lock|sign out/i }).first();
    if (await lockBtn.count()) {
      await capture(popup, 'settings', '05-security-lock-btn');
      await lockBtn.click();
      await sleep(2500);
      await capture(popup, 'home', '04-locked');
      // unlock
      const pw = popup.getByTestId('lock-password-input').first();
      if (await pw.count()) {
        await pw.fill(SECRETS.SALMON_TEST_PASSWORD);
        await popup.getByTestId('lock-unlock-button').click();
        await sleep(2500);
        await capture(popup, 'home', '05-unlocked');
      }
    }
  }
});

// === report ===
fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'PHASE1-WALKTHROUGH.md'),
  [
    '# Phase 1 walkthrough — ' + new Date().toISOString(),
    '',
    'extId: ' + extId,
    'init state: ' + initState,
    '',
    '## Console errors',
    '```',
    allErrors.length ? allErrors.join('\n') : '(none)',
    '```',
  ].join('\n')
);
log('done');

await sleep(1000);
await ctx.close();
process.exit(0);
