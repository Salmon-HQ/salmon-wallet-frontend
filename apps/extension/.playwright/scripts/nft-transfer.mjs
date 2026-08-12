// NFT transfer flow: send a Solana NFT from Wallet A to Wallet B.
// NOTE: dialog opens a Confirm modal (no Review step). May trigger a password
// prompt that the driver does not currently handle — outcome inconclusive
// for fully automated runs. Manual confirmation works.
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
} from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const log = (m) => console.log('▶ ' + m);
const findings = [];
const WALLET_B_ADDR = fs.readFileSync(path.join(fixturesRoot, 'wallet-b-addr.txt'), 'utf8').trim();

const { ctx, extId } = await launch();
log('extId=' + extId);

const popup = await openPopup(ctx, extId);
await unlockOrRecover(popup);
await waitHome(popup);
await sleep(3500);

await popup.getByTestId('tab-collectibles').first().click();
await sleep(2500);
// NFT card by name — mint id is fixture-specific, so no nft-card-<mint> id to hardcode here.
await popup.locator('text=/Salmon Logo/').first().click({ force: true });
await sleep(3000);

await popup.getByTestId('nft-detail-send-button').first().click({ force: true });
await sleep(2500);
await popup.getByRole('textbox').first().fill(WALLET_B_ADDR);
await sleep(2500); // wait validation
await capture(popup, 'nft-transfer', '01-recipient');

const confirm = popup.getByTestId('nft-send-confirm-button').first();
const enabled = await confirm.isEnabled().catch(() => false);
log('  Confirm enabled: ' + enabled);
if (!enabled) {
  findings.push('Step 10 FAIL: Confirm not enabled');
} else {
  await confirm.click({ force: true });
  log('  Confirm clicked, waiting for tx...');
  await sleep(30000);
  await capture(popup, 'nft-transfer', '02-result');
  const t = await popup.locator('body').innerText();
  findings.push('Step 10: result snippet=' + t.slice(0, 200).replace(/\n/g, ' | '));
}

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'PHASE2-NFT-TRANSFER.md'),
  ['# Phase 2 v8 — ' + new Date().toISOString(), '', ...findings.map((f) => '- ' + f)].join('\n')
);

await ctx.close();
process.exit(0);
