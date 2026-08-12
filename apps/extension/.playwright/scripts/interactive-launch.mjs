// Persistent chromium launcher for ad-hoc manual inspection of the Salmon
// extension. Loads the same extDist + persistent profile as the test runner,
// then keeps the process alive until SIGINT so you can drive the popup
// manually or attach DevTools.
//
// Usage: `node .playwright/scripts/interactive-launch.mjs`
//        Ctrl-C to quit. Profile state persists between launches.
import { launch, profileDir, extDist, repoRoot } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

if (!fs.existsSync(extDist)) {
  console.error('Extension dist missing:', extDist);
  console.error('Run `pnpm --filter @salmon/extension build --mode development` first.');
  process.exit(1);
}

const { ctx, sw, extId } = await launch();

console.log('extId=' + extId);
console.log('popup=chrome-extension://' + extId + '/popup.html');
console.log('sidepanel=chrome-extension://' + extId + '/sidepanel.html');
console.log('profile=' + profileDir);

const stateFile = path.join(fixturesRoot, 'last-session.json');
fs.mkdirSync(path.dirname(stateFile), { recursive: true });
fs.writeFileSync(
  stateFile,
  JSON.stringify({ extId, profileDir, extDist, ts: new Date().toISOString() }, null, 2)
);

console.log('\nPress Ctrl-C to exit. Profile persists.');
process.stdin.resume();
