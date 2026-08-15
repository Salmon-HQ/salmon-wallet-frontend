// Screenshot the Collectibles screen. Pass a label as argv[2] ("before"/"after").
// Read-only: unlocks, opens Collectibles, captures. Never spends.
import { launch, capture, sleep, openPopup, unlockOrRecover, waitHome } from './lib.mjs';

const label = process.argv[2] || 'run';

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);
await unlockOrRecover(popup);
await waitHome(popup);
await sleep(2500);

await popup.getByTestId('tab-collectibles').first().click({ timeout: 8000 });
await sleep(6000);

await capture(popup, `collectibles-${label}`, '01-collectibles');

const text = await popup.locator('body').innerText();
console.log(`▶ [${label}] collectibles body text:\n${text.slice(0, 400)}`);

const headings = await popup.locator('h1, h2').allInnerTexts();
console.log(`▶ [${label}] headings: ${JSON.stringify(headings)}`);

await ctx.close();
process.exit(0);
