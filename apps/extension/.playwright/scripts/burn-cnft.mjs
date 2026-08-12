// Final burn test — selector fixed (Burn NFT not /^Burn$/).
import { launch, capture, sleep, openPopup, SECRETS, reportsRoot } from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const log = (m) => console.log('▶ ' + m);
const findings = [];

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);

const pw = popup.getByTestId('lock-password-input').first();
if (await pw.count()) {
  await pw.fill(SECRETS.SALMON_TEST_PASSWORD);
  await popup.getByTestId('lock-unlock-button').click();
  await sleep(4000);
}
await sleep(2500);

await popup.getByTestId('tab-collectibles').first().click();
await sleep(4000);
const refresh = popup.getByRole('button', { name: /refresh/i }).first();
if (await refresh.count()) {
  await refresh.click().catch(() => {});
  await sleep(5000);
}

const before = await popup.$$eval('img[alt]', (els) =>
  els.map((e) => e.alt).filter((a) => /NFT image/i.test(a))
);
log('  before: ' + JSON.stringify(before));
findings.push('Before: ' + before.length + ' NFTs');

await popup.locator('img[alt="NFT image for JUP.PRO Drop Pass"]').first().click({ force: true });
await sleep(2500);
await capture(popup, 'burn-cnft', '01-detail');

// Select the burn action by its stable test id
const burn = popup.getByTestId('nft-detail-burn-button').first();
const burnCount = await burn.count();
log('  burn button count: ' + burnCount);
if (!burnCount) {
  findings.push('FAIL: still no Burn NFT button');
  fs.writeFileSync(
    path.join(reportsRoot, 'BURN-CNFT.md'),
    findings.map((f) => '- ' + f).join('\n')
  );
  await ctx.close();
  process.exit(1);
}
await burn.click({ force: true });
await sleep(2500);
await capture(popup, 'burn-cnft', '02-burn-page');

const text = await popup.locator('body').innerText();
if (!/irreversible/i.test(text)) {
  findings.push('SAFETY abort: not on Burn confirmation');
  fs.writeFileSync(
    path.join(reportsRoot, 'BURN-CNFT.md'),
    findings.map((f) => '- ' + f).join('\n')
  );
  await ctx.close();
  process.exit(1);
}

// Confirm the burn via its stable test id (only reached after the
// /irreversible/i safety gate above passed).
const burnConfirm = popup.getByTestId('nft-burn-confirm-button').first();
let confirmed = false;
if (await burnConfirm.count()) {
  await burnConfirm.click({ force: true }).catch(() => {});
  confirmed = true;
}
if (!confirmed) findings.push('FAIL: no confirm button found on burn page');

log('  burn submitted, waiting 30s...');
await sleep(30000);
await capture(popup, 'burn-cnft', '03-after-burn');

const result = await popup.locator('body').innerText();
log('  result: ' + result.slice(0, 250).replace(/\n/g, ' | '));
findings.push('Burn result: ' + result.slice(0, 250).replace(/\n/g, ' | '));

// Verify list now shorter
await popup
  .getByTestId('tab-collectibles')
  .first()
  .click()
  .catch(() => {});
await sleep(3000);
const refresh2 = popup.getByRole('button', { name: /refresh/i }).first();
if (await refresh2.count()) {
  await refresh2.click().catch(() => {});
  await sleep(5000);
}
await capture(popup, 'burn-cnft', '04-list-after');
const after = await popup.$$eval('img[alt]', (els) =>
  els.map((e) => e.alt).filter((a) => /NFT image/i.test(a))
);
log('  after: ' + JSON.stringify(after));
findings.push('After: ' + after.length + ' NFTs');
findings.push('Removed: ' + JSON.stringify(before.filter((n) => !after.includes(n))));

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'BURN-CNFT.md'),
  [
    '# cNFT Burn Test (corrected selector) — ' + new Date().toISOString(),
    '',
    ...findings.map((f) => '- ' + f),
  ].join('\n')
);

await ctx.close();
process.exit(0);
