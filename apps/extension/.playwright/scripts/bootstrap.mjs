// Phase 1 bootstrap: launch extension, open popup, capture initial state.
// Verifies infrastructure works before running the full Phase 1 walkthrough.
import { launch, capture, tapConsole, sleep, fixturesRoot } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const { ctx, sw, extId } = await launch();
console.log('extId=' + extId);

const popupUrl = `chrome-extension://${extId}/popup.html`;
const sidepanelUrl = `chrome-extension://${extId}/sidepanel.html`;

const popup = await ctx.newPage();
const popupErrors = tapConsole(popup, 'popup');
await popup.setViewportSize({ width: 360, height: 600 });
await popup.goto(popupUrl);
await sleep(2500);
await capture(popup, 'auth', '01-onboarding');

const sidepanel = await ctx.newPage();
const sideErrors = tapConsole(sidepanel, 'sidepanel');
await sidepanel.setViewportSize({ width: 400, height: 700 });
await sidepanel.goto(sidepanelUrl);
await sleep(2500);
await capture(sidepanel, 'auth', '02-sidepanel-onboarding');

const state = {
  extId,
  popupUrl,
  sidepanelUrl,
  popupErrors,
  sideErrors,
  swUrl: sw.url(),
};
fs.mkdirSync(fixturesRoot, { recursive: true });
fs.writeFileSync(path.join(fixturesRoot, 'last-bootstrap.json'), JSON.stringify(state, null, 2));

console.log(
  JSON.stringify({ done: true, errors: { popup: popupErrors, sidepanel: sideErrors } }, null, 2)
);

// keep alive briefly so screenshots flush, then exit cleanly
await sleep(500);
await ctx.close();
process.exit(0);
