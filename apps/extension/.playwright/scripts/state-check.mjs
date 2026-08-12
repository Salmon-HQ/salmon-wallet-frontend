// Quick state check post-phase2.
import { launch, capture, sleep, openPopup, unlockOrRecover, waitHome } from './lib.mjs';

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);
await unlockOrRecover(popup);
await waitHome(popup);
await sleep(3000);

await capture(popup, 'state-check', '01-home');

// Verify Salmon Logo still there
await popup
  .getByRole('button', { name: /Collectibles/i })
  .first()
  .click();
await sleep(2500);
await capture(popup, 'state-check', '02-collectibles');

const text = await popup.locator('body').innerText();
console.log('▶ home + collectibles state:');
console.log(text.slice(0, 500));

const hasSalmon = /Salmon Logo/.test(text);
const hasMindfolk = /Mindfolk/.test(text);
console.log('▶ Salmon Logo intact: ' + hasSalmon);
console.log('▶ Mindfolk intact: ' + hasMindfolk);

await ctx.close();
process.exit(0);
