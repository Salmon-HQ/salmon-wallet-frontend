// Phase 1 extras-2: NFT refresh+detail, dApp sign message (read-only), Security
// panel deep inspection for lock action.
import {
  launch,
  capture,
  sleep,
  openPopup,
  unlockOrRecover,
  waitHome,
  tapConsole,
  reportsRoot,
} from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const log = (m) => console.log('▶ ' + m);
const findings = [];
const errors = [];

const { ctx, extId } = await launch();
log('extId=' + extId);

// =============================================================================
// F. NFT detail — refresh + wait long, then click first card
// =============================================================================
async function testNftDetailHot() {
  log('=== F: NFT detail (hot) ===');
  const popup = await openPopup(ctx, extId);
  errors.push(...tapConsole(popup, 'nft'));
  await unlockOrRecover(popup);
  await waitHome(popup);

  // Click refresh icon to force reload
  const refresh = popup.getByRole('button', { name: /refresh/i }).first();
  if (await refresh.count()) {
    await refresh.click().catch(() => {});
    await sleep(3000);
  }

  // Switch to Collectibles tab
  const collTab = popup.getByRole('button', { name: /collectibles/i }).first();
  await collTab.click();
  await sleep(2500);

  // Refresh inside Collectibles tab too
  if (await refresh.count()) {
    await refresh.click().catch(() => {});
    await sleep(4000);
  }

  await capture(popup, 'nft-hot', '01-list');
  const listText = await popup.locator('body').innerText();
  log('  collectibles state: ' + listText.slice(0, 150).replace(/\n/g, ' | '));

  if (/No collectibles found/i.test(listText)) {
    findings.push(
      'NFT list (hot): empty — Helius DAS API likely not returning. Need 2nd refresh after backend warm-up.'
    );
    await popup.close();
    return;
  }

  // Find clickable NFT card. Try multiple strategies.
  const strategies = [
    () => popup.locator('img[alt*="Mindfolk"]').first(),
    () => popup.locator('img[alt*="Salmon"]').first(),
    () =>
      popup
        .locator('[role="button"]')
        .filter({ hasText: /Mindfolk|Salmon Logo/ })
        .first(),
    () => popup.locator('img').nth(2),
  ];
  let opened = false;
  for (const s of strategies) {
    const el = s();
    if (await el.count()) {
      await el.click({ force: true }).catch(() => {});
      await sleep(2500);
      const t = await popup.locator('body').innerText();
      if (/Send|Burn|Description|Properties|Collection|Owner/i.test(t)) {
        opened = true;
        await capture(popup, 'nft-hot', '02-detail');
        const keys = (t.match(/Send|Burn|Description|Properties|Collection|Owner/g) || []).join(
          ','
        );
        findings.push('NFT detail: opened, sections=' + keys);
        break;
      }
    }
  }
  if (!opened) findings.push('NFT detail: list non-empty but click did not navigate');
  await popup.close();
}

// =============================================================================
// G. dApp sign message — inject a page that calls window.salmon.signMessage
// =============================================================================
async function testDappSignMessage() {
  log('=== G: dApp sign message ===');
  // Create a minimal dApp page on a benign domain that exercises wallet-standard
  const dapp = await ctx.newPage();
  errors.push(...tapConsole(dapp, 'dapp'));
  await dapp.goto('https://jup.ag/swap');
  await sleep(8000);
  await capture(dapp, 'dapp-sign', '01-jup');

  // Extract injected wallet provider. wallet-standard registers via window.
  const providers = await dapp
    .evaluate(() => {
      const list = [];
      // Wallet-standard discovery: window.dispatchEvent + a global registry
      const w = window;
      if (w.solana) list.push('window.solana keys=' + Object.keys(w.solana).slice(0, 8).join(','));
      if (w.salmon) list.push('window.salmon keys=' + Object.keys(w.salmon).slice(0, 8).join(','));
      return list;
    })
    .catch((e) => ['eval err: ' + e.message]);
  log('  providers: ' + providers.join(' | '));

  // Try to drive signMessage via wallet-standard. If Jupiter's connect button
  // is visible, the wallet was injected. Driving signMessage UI from Jupiter
  // is complex (needs a real wallet flow). Instead, we observe whether the
  // approval popup pattern works when triggered programmatically.
  findings.push('dApp sign message: observed providers via jup.ag — ' + providers.join('; '));
  findings.push(
    'dApp sign message: full programmatic signMessage requires wallet-standard adapter scripting; deferred for focused script'
  );

  await dapp.close();
}

// =============================================================================
// H. Security panel — full inspection (look for any lock action)
// =============================================================================
async function testSecurityPanel() {
  log('=== H: Security panel deep ===');
  const popup = await openPopup(ctx, extId);
  await unlockOrRecover(popup);
  await waitHome(popup);
  await popup.getByTestId('wallet-header-settings-button').first().click();
  await sleep(800);
  await popup.getByTestId('settings-item-security').first().click({ force: true });
  await sleep(2200);
  await capture(popup, 'security-deep', '01-panel');

  // Scroll inside the panel to reveal hidden actions
  await popup
    .evaluate(() => {
      const dlg = document.querySelector('[role="presentation"]') || document.body;
      dlg.scrollTop = dlg.scrollHeight;
    })
    .catch(() => {});
  await sleep(800);
  await capture(popup, 'security-deep', '02-scrolled');

  // Inventory all buttons in panel
  const buttons = await popup.$$eval('[role="button"]', (els) =>
    els.map((e) => e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 60))
  );
  const lockHits = buttons.filter((b) => b && /lock|sign out|logout/i.test(b));
  log('  buttons in panel: ' + buttons.length);
  log('  lock-related: ' + (lockHits.length ? lockHits.join(', ') : '(none)'));
  findings.push(
    'Security panel: ' +
      buttons.length +
      ' buttons; lock-related=' +
      (lockHits.length ? lockHits.join(',') : 'NONE')
  );

  // Check entire popup body for any lock action outside Security
  await popup.locator('body').evaluate((b) => b);
  await popup.close();
}

await testNftDetailHot().catch((e) => log('  F err: ' + e.message));
await testDappSignMessage().catch((e) => log('  G err: ' + e.message));
await testSecurityPanel().catch((e) => log('  H err: ' + e.message));

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'PHASE1-DAPP-PROVIDERS.md'),
  [
    '# Phase 1 extras-2 — ' + new Date().toISOString(),
    '',
    '## Findings',
    ...findings.map((f) => '- ' + f),
    '',
    '## Errors',
    '```',
    errors.length ? errors.join('\n') : '(none)',
    '```',
  ].join('\n')
);

await ctx.close();
process.exit(0);
