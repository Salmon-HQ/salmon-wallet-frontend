// Wipe profile, recover Wallet B, toggle dev mode, compare NFT lists in both
// modes. Validates the spam-filter contract end-to-end: salmon-api hides
// scam cNFTs by default and surfaces them only when the FE passes
// `?includeSpam=true` (driven by developerNetworks). The FE no longer runs
// its own filter — the BE owns spam policy now.
import { launch, capture, sleep, openPopup, SECRETS, profileDir } from './lib.mjs';
import fs from 'node:fs';

fs.rmSync(profileDir, { recursive: true, force: true });

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);

// Recover Wallet B
await popup.getByRole('button', { name: /recover account/i }).click();
await sleep(1500);
await popup.locator('textarea').first().fill(SECRETS.SALMON_TEST_SEED_B);
await sleep(500);
await popup.getByRole('button', { name: /^next$/i }).click();
await sleep(1500);
const pw = popup.locator('input[type="password"]');
await pw.nth(0).fill(SECRETS.SALMON_TEST_PASSWORD);
await pw.nth(1).fill(SECRETS.SALMON_TEST_PASSWORD);
await sleep(500);
await popup.getByRole('button', { name: /recover account/i }).click();
await sleep(4000);
const goAcct = popup.getByRole('button', { name: /go to my/i });
if (await goAcct.count()) {
  await goAcct.click();
  await sleep(2500);
}
await sleep(3000);

// Mode OFF — Collectibles list
await popup.getByTestId('tab-collectibles').first().click();
await sleep(4000);
await capture(popup, 'walletB-nfts', '01-off');
const offNfts = await popup.$$eval('img[alt]', (els) =>
  els.map((e) => e.alt).filter((a) => /NFT image/i.test(a))
);
console.log('▶ Wallet B NFTs (dev OFF): ' + JSON.stringify(offNfts));
const offText = await popup.locator('body').innerText();
const empty1 = /No collectibles found/i.test(offText);
console.log('▶ empty (off): ' + empty1);

// Toggle dev mode ON
await popup.getByTestId('wallet-header-settings-button').first().click();
await sleep(900);
const sw = popup.getByTestId('settings-developer-networks-toggle').last();
await sw.scrollIntoViewIfNeeded().catch(() => {});
await sleep(800);
const checked = await sw.isChecked().catch(() => false);
if (!checked) {
  await sw.click({ force: true });
  await sleep(2000);
}
await popup
  .getByTestId('settings-close-button')
  .first()
  .click()
  .catch(() => {});
await sleep(1500);

// Collectibles ON
await popup.getByTestId('tab-collectibles').first().click();
await sleep(4000);
const refresh = popup.getByRole('button', { name: /refresh/i }).first();
if (await refresh.count()) {
  await refresh.click().catch(() => {});
  await sleep(5000);
}
await capture(popup, 'walletB-nfts', '02-on');
const onNfts = await popup.$$eval('img[alt]', (els) =>
  els.map((e) => e.alt).filter((a) => /NFT image/i.test(a))
);
console.log('▶ Wallet B NFTs (dev ON): ' + JSON.stringify(onNfts));
const onText = await popup.locator('body').innerText();
const empty2 = /No collectibles found/i.test(onText);
console.log('▶ empty (on): ' + empty2);

console.log('▶ DIFF newWithDev: ' + JSON.stringify(onNfts.filter((n) => !offNfts.includes(n))));

await ctx.close();
process.exit(0);
