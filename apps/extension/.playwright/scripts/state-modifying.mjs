// State-modifying walkthrough: Address Book Save (Wallet B), Send 0.001 SOL,
// NFT Transfer. Waits for async address validation before clicking Save/Send.
// Requires .playwright/fixtures/wallet-b-addr.txt populated by discover-wallet-addr.mjs.
import {
  launch,
  capture,
  sleep,
  openPopup,
  unlockOrRecover,
  waitHome,
  tapConsole,
  SECRETS,
  repoRoot,
  reportsRoot,
  waitForButtonEnabled,
} from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const log = (m) => console.log('▶ ' + m);
const findings = [];
const errors = [];
const WALLET_B_ADDR = fs.readFileSync(path.join(fixturesRoot, 'wallet-b-addr.txt'), 'utf8').trim();
log('Wallet B = ' + WALLET_B_ADDR);

const { ctx, extId } = await launch();
log('extId=' + extId);

async function freshPopup(label) {
  const popup = await openPopup(ctx, extId);
  errors.push(...tapConsole(popup, label));
  await unlockOrRecover(popup);
  await waitHome(popup);
  await sleep(3500);
  return popup;
}

// === Step 2: Address Book Save Wallet B ===
async function step2() {
  log('=== 2: Address Book Save Wallet B ===');
  const popup = await freshPopup('s2');
  await popup.getByTestId('wallet-header-settings-button').first().click();
  await sleep(900);
  await popup.getByTestId('settings-item-address-book').first().click({ force: true });
  await sleep(2200);
  await popup.getByTestId('address-book-add-button').first().click({ force: true });
  await sleep(2000);

  await popup.getByTestId('address-book-label-input').fill('Wallet B');
  await popup.getByTestId('address-book-address-input').fill(WALLET_B_ADDR);
  log('  filled, waiting for Save Address to enable...');
  const enabled = await waitForButtonEnabled(popup, /Save Address/i, 20000);
  log('  Save Address enabled: ' + enabled);
  await capture(popup, 'state-modifying', '02a-form-validated');

  if (!enabled) {
    findings.push('Step 2 PARTIAL: Save Address disabled after 20s wait');
    await popup.close();
    return;
  }
  await popup.getByTestId('address-book-save-button').first().click({ force: true });
  await sleep(2500);
  await capture(popup, 'state-modifying', '02b-saved');
  findings.push('Step 2 OK: Wallet B saved to address book');
  await popup.close();
}

// === Step 7: Send 0.001 SOL → Wallet B ===
async function step7() {
  log('=== 7: Send 0.001 SOL → Wallet B ===');
  const popup = await freshPopup('s7');
  await capture(popup, 'state-modifying', '07a-home');

  // Wait for Send button via locator strict mode
  const sendBtn = popup.getByTestId('home-send-button');
  await sendBtn.waitFor({ state: 'visible', timeout: 30000 });
  log('  Send button found');
  await sendBtn.click({ force: true });
  await sleep(2200);
  await popup.getByTestId('send-token-row-SOL').first().click({ force: true });
  await sleep(2500);
  await capture(popup, 'state-modifying', '07b-form');

  await popup.getByTestId('send-recipient-input').fill(WALLET_B_ADDR);
  await sleep(1500); // wait for addr validation
  const amt = popup.getByTestId('send-amount-input');
  if (await amt.count()) {
    await amt.fill('0.001');
    await sleep(800);
  }
  await capture(popup, 'state-modifying', '07c-filled');

  // Wait for Review button enabled
  const reviewEnabled = await waitForButtonEnabled(popup, /Review|Continue|Next/i, 15000);
  log('  Review enabled: ' + reviewEnabled);
  if (!reviewEnabled) {
    findings.push('Step 7 PARTIAL: Review never enabled');
    await popup.close();
    return;
  }
  await popup.getByTestId('send-review-button').click({ force: true });
  await sleep(4000);
  await capture(popup, 'state-modifying', '07d-review');

  const send = popup.getByTestId('send-confirm-button');
  if (!(await send.count())) {
    findings.push('Step 7 PARTIAL: review page no Send/Confirm button');
    await popup.close();
    return;
  }
  await send.click({ force: true });
  log('  Send confirm clicked, waiting for tx submit...');
  await sleep(30000);
  await capture(popup, 'state-modifying', '07e-result');
  const t = await popup.locator('body').innerText();
  const success = /success|sent|confirm|Tx|signature|done/i.test(t);
  findings.push(
    'Step 7 ' +
      (success ? 'OK' : 'PARTIAL') +
      ': result snippet=' +
      t.slice(0, 200).replace(/\n/g, ' | ')
  );
  await popup.close();
}

// === Step 10: NFT Transfer Salmon Logo → Wallet B ===
async function step10() {
  log('=== 10: NFT Transfer Salmon Logo → Wallet B ===');
  const popup = await freshPopup('s10');
  await popup
    .getByRole('button', { name: /Collectibles/i })
    .first()
    .click();
  await sleep(2500);
  const target = popup.locator('text=/Salmon Logo/').first();
  if (!(await target.count())) {
    findings.push('Step 10 FAIL: Salmon Logo missing');
    await popup.close();
    return;
  }
  await target.click({ force: true });
  await sleep(3000);
  await capture(popup, 'state-modifying', '10a-detail');

  const sendBtn = popup.locator('button').filter({ hasText: 'Send' }).first();
  await sendBtn.waitFor({ state: 'visible', timeout: 15000 });
  await sendBtn.click({ force: true });
  await sleep(2500);

  await popup.getByRole('textbox').first().fill(WALLET_B_ADDR);
  await sleep(1500);
  await capture(popup, 'state-modifying', '10b-recipient');

  const reviewEnabled = await waitForButtonEnabled(popup, /Review|Continue|Next/i, 15000);
  if (!reviewEnabled) {
    findings.push('Step 10 PARTIAL: Review never enabled');
    await popup.close();
    return;
  }
  await popup
    .getByRole('button', { name: /Review|Continue|Next/i })
    .first()
    .click({ force: true });
  await sleep(4000);
  await capture(popup, 'state-modifying', '10c-review');

  const send = popup.getByRole('button', { name: /^(Send|Confirm)$/i }).first();
  if (await send.count()) {
    await send.click({ force: true });
    log('  NFT send confirm clicked');
    await sleep(30000);
    await capture(popup, 'state-modifying', '10d-result');
    const t = await popup.locator('body').innerText();
    findings.push(
      'Step 10: NFT transfer submitted, result snippet=' + t.slice(0, 200).replace(/\n/g, ' | ')
    );
  } else findings.push('Step 10 PARTIAL: no Send/Confirm on review');
  await popup.close();
}

const steps = [step2, step7, step10];
for (const s of steps) {
  await s().catch((e) => {
    log('  err: ' + e.message);
    findings.push(s.name + ' EXCEPTION: ' + e.message);
  });
}

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'PHASE2-STATE-MODIFYING.md'),
  [
    '# Phase 2 v7 — ' + new Date().toISOString(),
    '',
    'Wallet B addr: `' + WALLET_B_ADDR + '`',
    '',
    '## Findings',
    ...findings.map((f) => '- ' + f),
    '',
    '## Console errors',
    '```',
    errors.length ? errors.slice(0, 60).join('\n') : '(none)',
    '```',
  ].join('\n')
);

await ctx.close();
process.exit(0);
