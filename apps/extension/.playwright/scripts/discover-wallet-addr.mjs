// Recover a seed (defaults to SEED_B) and capture its Solana receive address.
// Writes to .playwright/fixtures/wallet-b-addr.txt for downstream tests.
// Wipes profile at start AND end so subsequent runs default back to SEED_A.
($1, fixturesRoot$2);
import fs from 'node:fs';
import path from 'node:path';

const outPath = path.join(fixturesRoot, 'wallet-b-addr.txt');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const { ctx, extId } = await launch();
const popup = await openPopup(ctx, extId);

// Unlock
const pw = popup.locator('input[type="password"]').first();
if (await pw.count()) {
  await pw.fill(SECRETS.SALMON_TEST_PASSWORD);
  await popup.getByRole('button', { name: /unlock/i }).click();
  await sleep(4000);
}
await sleep(2500);

await capture(popup, 'walletB-discover', '03-state');
const initText = await popup.locator('body').innerText();
console.log('▶ initial body text snippet:');
console.log(initText.slice(0, 300));

// If on settings, close it
const closeBtn = popup.getByRole('button', { name: /^Close$/i }).first();
if (await closeBtn.count()) {
  await closeBtn.click().catch(() => {});
  await sleep(1500);
}

// Click Home tab if present
const home = popup.getByRole('button', { name: /^Home$/i }).first();
if (await home.count()) {
  await home.click().catch(() => {});
  await sleep(1500);
}

// Click Receive — all variations
let receiveClicked = false;
for (const sel of [/^Receive$/i, /Receive/i]) {
  const btn = popup.getByRole('button', { name: sel }).first();
  if (await btn.count()) {
    await btn.click({ force: true }).catch(() => {});
    await sleep(2500);
    receiveClicked = true;
    break;
  }
}
console.log('▶ receive clicked: ' + receiveClicked);
await capture(popup, 'walletB-discover', '04-receive');

// Read body for address
const text = await popup.locator('body').innerText();
const candidates = (text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) || []).filter(
  (s) => !/^(Account|Wallet|Settings|Backup|Reveal|Receive|Click)/.test(s)
);
const addr = candidates.sort((a, b) => b.length - a.length)[0];

if (!addr) {
  console.log('▶ ERROR: addr not found');
  console.log(text.slice(0, 800));
  await ctx.close();
  process.exit(1);
}

console.log('▶ Wallet B Solana addr: ' + addr);
fs.writeFileSync(outPath, addr + '\n');
await ctx.close();
fs.rmSync(profileDir, { recursive: true, force: true });
console.log('▶ profile wiped, ready for Wallet A');
process.exit(0);
