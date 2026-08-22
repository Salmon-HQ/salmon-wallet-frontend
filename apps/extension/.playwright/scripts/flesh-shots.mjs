// Rerunnable capture for the salmon-fill texture pass (scales -> flesh).
//
//   node scripts/flesh-shots.mjs before
//   node scripts/flesh-shots.mjs after
//
// Captures the three fills the pass is judged on, each cropped to the control
// itself so the texture is judged at the size it actually ships at:
//   - the full-width Unlock button on the lock screen (the motivating case:
//     the seigaiha tile is 12.8x a pill's height, so it read as a stamp)
//   - the Send CTA on home (a primary call-to-action)
//   - the Copy address pill in the Receive sheet (the smallest salmon fill)
//
// Read-only: it never sends, swaps, or signs anything.
import fs from 'node:fs';
import path from 'node:path';
import {
  launch,
  capture,
  sleep,
  openPopup,
  unlockOrRecover,
  waitHome,
  screensRoot,
  PASSWORD,
} from './lib.mjs';

const label = process.argv[2] || 'before';
const folder = `flesh-${label}`;
const log = (m) => console.log('▶ ' + m);
const dir = path.join(screensRoot, folder);
fs.mkdirSync(dir, { recursive: true });

/** A tight crop of one control, at 3x, so bands are judgeable by eye. */
async function shot(page, testId, name) {
  const el = page.getByTestId(testId).first();
  await el.waitFor({ state: 'visible', timeout: 10000 });
  await el.screenshot({ path: path.join(dir, name + '.png') });
  console.log('captured ' + folder + '/' + name);
}

async function step(name, fn) {
  try {
    log(name);
    await fn();
  } catch (e) {
    log('  ⚠ ' + name + ' failed: ' + e.message.split('\n')[0]);
  }
}

const { ctx, extId } = await launch({ deviceScaleFactor: 3 });
const popup = await openPopup(ctx, extId);
await sleep(1500);

// 1. The lock screen, before unlocking: the full-width Unlock button. The
//    password has to be filled first — an empty field leaves the button
//    disabled, and a disabled button is `surface.crest` with no salmon and
//    therefore no texture to judge.
await step('unlock button (full width)', async () => {
  const pw = popup.getByTestId('lock-password-input').first();
  if (await pw.count()) {
    await pw.fill(PASSWORD);
    await sleep(600);
  }
  await capture(popup, folder, '01-lock-screen');
  await shot(popup, 'lock-unlock-button', '02-unlock-button');
});

await unlockOrRecover(popup);
await waitHome(popup);
await sleep(1500);

// 2. Home: the Send CTA.
await step('send CTA', async () => {
  await capture(popup, folder, '03-home');
  await shot(popup, 'home-send-button', '04-send-cta');
});

// 3. The Receive sheet: the smallest salmon fill in the product.
await step('copy pill (smallest fill)', async () => {
  await popup.getByTestId('home-receive-button').click();
  await sleep(2500);
  await capture(popup, folder, '05-receive-sheet');
  await shot(popup, 'receive-copy-button', '06-copy-pill');
});

await ctx.close();
log('done → screenshots/' + folder);
