// Phase 1 extras: lock cycle, re-lock-on-reload, About/Help, NFT detail.
// Each section isolated (own page) for state hygiene.
import {
  launch,
  capture,
  sleep,
  openPopup,
  unlockOrRecover,
  waitHome,
  reportsRoot,
} from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const log = (m) => console.log('▶ ' + m);
const findings = [];

const { ctx, extId } = await launch();
log('extId=' + extId);

// =============================================================================
// 1. Lock cycle: unlock → settings → security → ??? (no explicit lock button —
//    extension may lock via gear menu or auto-lock). Test what's available.
// =============================================================================
async function testLockCycle() {
  log('=== lock cycle ===');
  const popup = await openPopup(ctx, extId);
  await unlockOrRecover(popup);
  await waitHome(popup);

  // Look for lock-now button anywhere reachable
  const lockBtn = popup.getByRole('button', { name: /lock|sign out/i }).first();
  const lockCount = await popup.getByRole('button', { name: /lock|sign out/i }).count();
  log('  lock buttons found = ' + lockCount);
  if (lockCount > 0) {
    await lockBtn.click().catch(() => {});
    await sleep(1500);
    await capture(popup, 'lock', '01-after-lock-click');
    findings.push('lock cycle: explicit lock button exists');
  } else {
    findings.push(
      'lock cycle: NO explicit lock button on home — would require Security panel or auto-lock'
    );
    await capture(popup, 'lock', '01-no-lock-btn');
  }
  await popup.close();
}

// =============================================================================
// 2. Re-lock on popup reload — does popup re-lock when reloaded immediately?
// =============================================================================
async function testRelockOnReload() {
  log('=== re-lock on reload ===');
  const popup = await openPopup(ctx, extId);
  await unlockOrRecover(popup);
  await waitHome(popup);
  const before = await popup.locator('body').innerText();
  const wasUnlocked = /\$\d/.test(before);
  log('  unlocked before reload = ' + wasUnlocked);

  await popup.reload();
  await sleep(3000);
  const after = await popup.locator('body').innerText();
  const stillUnlocked = /\$\d/.test(after);
  const showsPasswordPrompt = /Enter your password|Unlock/i.test(after);
  log('  unlocked after reload = ' + stillUnlocked);
  log('  shows password prompt = ' + showsPasswordPrompt);

  await capture(popup, 'lock', '02-after-reload');
  if (wasUnlocked && !stillUnlocked) {
    findings.push(
      're-lock on reload: BUG — popup re-locks immediately after reload (unexpected for MV3 with valid session)'
    );
  } else if (wasUnlocked && stillUnlocked) {
    findings.push('re-lock on reload: OK — popup stays unlocked across reload');
  } else {
    findings.push('re-lock on reload: inconclusive (initial state not unlocked)');
  }
  await popup.close();
}

// =============================================================================
// 3. About + Help & Support panels
// =============================================================================
async function testAboutHelp() {
  log('=== About + Help ===');
  for (const [slug] of [
    ['about', 'About'],
    ['support', 'Help & Support'],
  ]) {
    const popup = await openPopup(ctx, extId);
    await unlockOrRecover(popup);
    await waitHome(popup);
    await popup.getByTestId('wallet-header-settings-button').first().click();
    await sleep(800);
    const btn = popup.getByTestId('settings-item-' + slug).first();
    if (!(await btn.count())) {
      findings.push(slug + ': button not found');
      await popup.close();
      continue;
    }
    await btn.click({ force: true });
    await sleep(2500);
    await capture(popup, 'settings', 'panel-' + slug);
    const text = await popup.locator('body').innerText();
    findings.push(
      slug + ': panel opened, content snippet = ' + text.slice(0, 120).replace(/\n/g, ' | ')
    );
    await popup.close();
  }
}

// =============================================================================
// 4. NFT detail page — click first collectible
// =============================================================================
async function testNftDetail() {
  log('=== NFT detail ===');
  const popup = await openPopup(ctx, extId);
  await unlockOrRecover(popup);
  await waitHome(popup);
  // Tap "Collectibles" tab
  const collTab = popup.getByRole('button', { name: /collectibles/i }).first();
  if (await collTab.count()) {
    await collTab.click();
    await sleep(1800);
    await capture(popup, 'nft', '01-list');
  }

  // Click first NFT card. They render as buttons or clickable cards. Try a
  // few selectors.
  let opened = false;
  for (const sel of [
    'button[aria-label*="Mindfolk"]',
    'button[aria-label*="Salmon"]',
    'button[aria-label*="NFT"]',
    'img[alt*="Mindfolk"]',
    'img[alt*="Salmon Logo"]',
  ]) {
    const el = popup.locator(sel).first();
    if (await el.count()) {
      await el.click({ force: true }).catch(() => {});
      await sleep(2000);
      const text = await popup.locator('body').innerText();
      if (/Send|Burn|Description|Properties|Owner/i.test(text)) {
        opened = true;
        await capture(popup, 'nft', '02-detail');
        findings.push(
          'NFT detail: opened via "' +
            sel +
            '" — keys=' +
            (text.match(/Send|Burn|Description|Properties|Owner/g) || []).join(',')
        );
        break;
      }
    }
  }
  if (!opened) {
    findings.push('NFT detail: could not open detail page (no matching selector)');
    await capture(popup, 'nft', '03-no-detail');
  }
  await popup.close();
}

await testLockCycle().catch((e) => log('  lock err: ' + e.message));
await testRelockOnReload().catch((e) => log('  reload err: ' + e.message));
await testAboutHelp().catch((e) => log('  about err: ' + e.message));
await testNftDetail().catch((e) => log('  nft err: ' + e.message));

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'PHASE1-LOCK-AND-PAGES.md'),
  ['# Phase 1 extras — ' + new Date().toISOString(), '', ...findings.map((f) => '- ' + f)].join(
    '\n'
  )
);

await ctx.close();
process.exit(0);
