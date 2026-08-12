// Phase 1 settings — isolated panel walkthrough.
// Bug observado: tras navegar a un sub-panel (Accounts), `popup.goto(popupUrl)`
// no resetea el route SPA — la app retiene state vía localStorage/route. Para
// cada panel: cerrar la page por completo y abrir una nueva.
import {
  launch,
  capture,
  tapConsole,
  sleep,
  openPopup,
  unlockOrRecover,
  waitHome,
  reportsRoot,
} from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const allErrors = [];
const log = (m) => console.log('▶ ' + m);

const { ctx, sw, extId } = await launch();
log('extId=' + extId);

async function openSettingsAndCapture(slug, name) {
  log('panel → ' + slug);
  const popup = await openPopup(ctx, extId);
  allErrors.push(...tapConsole(popup, 'popup-' + slug));
  await unlockOrRecover(popup);
  await waitHome(popup);

  // open settings dialog
  const gear = popup.getByTestId('wallet-header-settings-button').first();
  if (await gear.count()) {
    await gear.click({ timeout: 5000 }).catch(() => {});
    await sleep(1200);
  }

  if (!(await popup.getByRole('dialog').count())) {
    log('  ⚠ settings dialog did not open');
    await popup.close();
    return;
  }

  // click target panel by its stable test id (settings-item-<slug>)
  const btn = popup.getByTestId('settings-item-' + slug).first();
  if (!(await btn.count())) {
    log('  ⚠ panel button "' + name + '" not found');
    await capture(popup, 'settings', 'failed-' + slug);
    await popup.close();
    return;
  }
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(300);
  await btn.click({ timeout: 6000, force: true }).catch((e) => log('  click err: ' + e.message));
  await sleep(2500);

  await capture(popup, 'settings', 'panel-' + slug);
  await popup.close();
  await sleep(500);
}

const panels = [
  ['accounts', 'Accounts'],
  ['profile-picture', 'Profile Picture'],
  ['security', 'Security'],
  ['backup-seed', 'Backup Seed Phrase'],
  ['private-key', 'Private Key'],
  ['display-language', 'Display Language'],
  ['display-currency', 'Display Currency'],
  ['block-explorer', 'Block Explorer'],
  ['address-book', 'Address Book'],
  ['trusted-apps', 'Trusted Apps'],
];

for (const [slug, name] of panels) {
  await openSettingsAndCapture(slug, name).catch((e) => log('  unexpected: ' + e.message));
}

fs.mkdirSync(reportsRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportsRoot, 'PHASE1-SETTINGS-PANELS.md'),
  [
    '# Settings isolated walkthrough — ' + new Date().toISOString(),
    '',
    '## Console errors',
    '```',
    allErrors.length ? allErrors.join('\n') : '(none)',
    '```',
  ].join('\n')
);

await sleep(500);
await ctx.close();
process.exit(0);
