// Structural before/after shots of the transaction success + in-flight screens.
// Renders the temporary web preview route (/dev/flow-preview) — no wallet, no
// signing, no on-chain calls.
//
// Usage:
//   OUT_DIR=../screenshots/flow-structure/after SALMON_WEB_URL=http://localhost:5173 \
//     node flow-structure-shots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SALMON_WEB_URL || 'http://localhost:5173';
const outDir = path.resolve(process.env.OUT_DIR || './flow-structure');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 520, height: 1400 } });

await page.goto(`${baseUrl}/dev/flow-preview`, { waitUntil: 'networkidle' });

const shots = [
  ['preview-success', 'success.png'],
  ['preview-inflight', 'inflight.png'],
];

for (const [testId, file] of shots) {
  const el = page.getByTestId(testId);
  await el.waitFor({ state: 'visible', timeout: 20000 });
  // Let entry animations / spinners settle before capturing.
  await page.waitForTimeout(1500);
  const dest = path.join(outDir, file);
  await el.screenshot({ path: dest });
  console.log(`saved ${dest}`);
}

await browser.close();
