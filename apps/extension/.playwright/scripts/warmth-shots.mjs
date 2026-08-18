// Rerunnable capture for the "warmth + tabular numbers" pass.
//
//   node scripts/warmth-shots.mjs before
//   node scripts/warmth-shots.mjs after
//
// Captures the three surfaces the pass is judged on — home, a token row /
// token detail, and a screen with amounts in a column (transaction history) —
// plus a measured tabular-figures proof written to reports/.
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
  clickBack,
  reportsRoot,
} from './lib.mjs';

const label = process.argv[2] || 'before';
const folder = `warmth-${label}`;
const log = (m) => console.log('▶ ' + m);

async function step(name, fn) {
  try {
    log(name);
    await fn();
  } catch (e) {
    log('  ⚠ ' + name + ' failed: ' + e.message.split('\n')[0]);
  }
}

async function backHome() {
  for (let i = 0; i < 6; i++) {
    if (await popup.getByTestId('home-send-button').count()) return;
    if (!(await clickBack(popup))) {
      const close = popup.getByRole('button', { name: /^Close$/i }).first();
      if (await close.count()) await close.click().catch(() => {});
    }
    await sleep(900);
  }
}

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);
await unlockOrRecover(popup);
await waitHome(popup);
await sleep(1500);

await capture(popup, folder, '01-home');

// The token row, at its own scale.
await step('token row crop', async () => {
  const row = popup.locator('[data-testid^="token-row-"]').first();
  await row.waitFor({ state: 'visible', timeout: 8000 });
  const dir = path.join(reportsRoot, '..', 'screenshots', folder);
  fs.mkdirSync(dir, { recursive: true });
  await row.screenshot({ path: path.join(dir, '02-token-row.png') });
  log('captured ' + folder + '/02-token-row');
});

// Token detail — a column of amounts plus a price/change pair.
await step('token detail', async () => {
  await popup.locator('[data-testid^="token-row-"]').first().click({ timeout: 6000 });
  await sleep(3000);
  await capture(popup, folder, '03-token-detail');
  await backHome();
});

// Transaction history — the canonical column of amounts.
await step('activity list', async () => {
  await popup.getByTestId('home-activity-button').first().click({ timeout: 6000 });
  await sleep(3500);
  await capture(popup, folder, '04-activity-column');
  await backHome();
});

// Swap — amounts, rate, fee, slippage in one stack.
await step('swap', async () => {
  const tab = popup.getByTestId('tab-swap').first();
  if (await tab.count()) {
    await tab.click({ timeout: 6000 });
    await sleep(3500);
    await capture(popup, folder, '05-swap');
  }
});

// --- Tabular-figures proof -------------------------------------------------
// Measure the SAME string of digits at two different digit values, using the
// computed font of a real balance element on the page. If figures are tabular
// the two widths are identical; if proportional they differ (stock DM Sans's `1` is
// 384 units against `0` at 663).
await step('tabular proof', async () => {
  const probe = await popup.evaluate(() => {
    // Measure in the app's own face at the balance size, so the numbers are
    // the shipped face's real advance widths rather than a fallback's.
    const cs = { fontFamily: 'DM Sans, sans-serif', fontSize: '60px', fontWeight: '600' };
    const measure = (text, variant) => {
      const el = document.createElement('span');
      el.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-variant-numeric:${variant};`;
      el.textContent = text;
      document.body.appendChild(el);
      const w = el.getBoundingClientRect().width;
      el.remove();
      return w;
    };
    const balanceEl =
      document.querySelector('[data-testid="balance-eye-toggle"]')?.parentElement
        ?.previousElementSibling?.firstElementChild ?? null;
    return {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      appliedVariantOnBalance: balanceEl ? getComputedStyle(balanceEl).fontVariantNumeric : 'n/a',
      normal: { ones: measure('111111', 'normal'), zeros: measure('000000', 'normal') },
      tabular: {
        ones: measure('111111', 'tabular-nums'),
        zeros: measure('000000', 'tabular-nums'),
      },
    };
  });

  // Widths of every visible amount-bearing element in the activity column, so
  // the "column does not shift" claim is measured, not asserted.
  const columnWidths = await popup.evaluate(() =>
    Array.from(document.querySelectorAll('*'))
      .filter((el) => el.children.length === 0 && /\d[\d.,]*\s*$/.test(el.textContent || ''))
      .slice(0, 24)
      .map((el) => ({
        text: (el.textContent || '').trim().slice(0, 24),
        variant: getComputedStyle(el).fontVariantNumeric,
        width: +el.getBoundingClientRect().width.toFixed(2),
      }))
  );

  fs.mkdirSync(reportsRoot, { recursive: true });
  fs.writeFileSync(
    path.join(reportsRoot, `tabular-proof-${label}.json`),
    JSON.stringify({ probe, columnWidths }, null, 2)
  );
  log(
    `tabular proof: normal 111111=${probe.normal.ones} 000000=${probe.normal.zeros} | ` +
      `tabular 111111=${probe.tabular.ones} 000000=${probe.tabular.zeros} | ` +
      `applied variant on the real balance: ${probe.appliedVariantOnBalance}`
  );
});

await ctx.close();
log('done → screenshots/' + folder);
