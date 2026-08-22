// Stage the multi-chain Collectibles case: turn Developer Networks ON so the
// devnet section joins mainnet, capture, then turn it back OFF.
// Read-only w.r.t. funds — only flips a local UI setting.
import { launch, capture, sleep, openPopup, unlockOrRecover, waitHome } from './lib.mjs';

const label = process.argv[2] || 'multichain';

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);
await unlockOrRecover(popup);
await waitHome(popup);
await sleep(2000);

async function toggleDeveloperNetworks() {
  await popup.getByTestId('wallet-header-settings-button').click({ timeout: 10000 });
  await sleep(1500);
  const toggle = popup.getByTestId('settings-developer-networks-toggle').first();
  await toggle.click({ timeout: 10000 });
  await sleep(1500);
  await popup.keyboard.press('Escape');
  await sleep(1500);
}

await toggleDeveloperNetworks();

await popup.getByTestId('tab-collectibles').first().click({ timeout: 8000 });
await sleep(1200);
await capture(popup, `collectibles-${label}`, '01-loading');
await sleep(8000);
await capture(popup, `collectibles-${label}`, '02-settled');

const text = await popup.locator('body').innerText();
console.log(`▶ [${label}] body text:\n${text.slice(0, 500)}`);
const headings = await popup.locator('h1, h2').allInnerTexts();
console.log(`▶ [${label}] headings: ${JSON.stringify(headings)}`);

// restore
await popup
  .getByTestId('tab-home')
  .first()
  .click({ timeout: 8000 })
  .catch(() => {});
await sleep(1000);
await toggleDeveloperNetworks();
console.log('▶ developer networks toggled back off');

await ctx.close();
process.exit(0);
