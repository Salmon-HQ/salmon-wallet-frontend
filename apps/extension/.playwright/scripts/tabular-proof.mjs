// Proof that rendered numbers no longer reflow.
//
//   node scripts/tabular-proof.mjs
//
// For each real number on the home screen it clones the live element (so the
// clone inherits the exact computed style the app applies), swaps the digits
// for all-1s and then all-0s, and measures both. Geist's proportional `1` is
// 384 units against `0` at 663, so a non-tabular element's two widths differ;
// a tabular one's are identical. Read-only — the clones are measured off-screen
// and removed.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, openPopup, unlockOrRecover, waitHome, reportsRoot } from './lib.mjs';

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);
await unlockOrRecover(popup);
await waitHome(popup);
await sleep(2000);

const rows = await popup.evaluate(() => {
  const measureAs = (el, digit) => {
    const clone = el.cloneNode(true);
    clone.textContent = (el.textContent || '').replace(/\d/g, digit);
    Object.assign(clone.style, {
      position: 'absolute',
      left: '-9999px',
      top: '0',
      width: 'auto',
      whiteSpace: 'pre',
    });
    el.parentElement.appendChild(clone);
    const w = clone.getBoundingClientRect().width;
    clone.remove();
    return +w.toFixed(2);
  };

  return Array.from(document.querySelectorAll('p, span, div, input'))
    .filter((el) => el.children.length === 0 && /\d/.test(el.textContent || ''))
    .map((el) => {
      const ones = measureAs(el, '1');
      const zeros = measureAs(el, '0');
      return {
        text: (el.textContent || '').trim().slice(0, 28),
        variant: getComputedStyle(el).fontVariantNumeric,
        widthAllOnes: ones,
        widthAllZeros: zeros,
        reflowPx: +Math.abs(ones - zeros).toFixed(2),
      };
    });
});

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(path.join(reportsRoot, 'tabular-proof.json'), JSON.stringify(rows, null, 2));

const bad = rows.filter((r) => r.reflowPx > 0.5);
for (const r of rows) {
  console.log(
    `${r.reflowPx > 0.5 ? '✗' : '✓'} ${JSON.stringify(r.text).padEnd(30)} ` +
      `variant=${r.variant.padEnd(13)} 1s=${r.widthAllOnes} 0s=${r.widthAllZeros} ` +
      `reflow=${r.reflowPx}px`
  );
}
console.log(`\n${rows.length - bad.length}/${rows.length} rendered numbers do not reflow.`);

await ctx.close();
