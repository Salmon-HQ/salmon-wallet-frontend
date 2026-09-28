/**
 * An unlocked, idle wallet locks after five minutes — and opening another
 * wallet window does not postpone it.
 *
 * Mounting used to count as activity: every window the wallet opened wrote the
 * shared last-activity timestamp, including the approval window a web page can
 * ask for. A page could keep the wallet unlocked indefinitely by sending a
 * request every few minutes. This spec opens a second window halfway through
 * the idle period, the way that request would, and expects the lock on the
 * original schedule.
 *
 * Real time, on purpose: the timestamp is shared across windows through the
 * background, and a fake clock in one page would not govern the other. Slow
 * (about six minutes), read-only.
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const IDLE_LOCK_MS = 5 * 60_000;
/** Lock must land before this: a reset at the halfway mark would push it to 7.5 min. */
const LOCK_DEADLINE_MS = 6.5 * 60_000;

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('locks on schedule even when another wallet window opens mid-idle', async ({
  popup,
  context,
  extensionId,
}) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  test.setTimeout(9 * 60_000);

  await unlockOrRecover(popup);
  await waitHome(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible();
  const unlockedAt = Date.now();

  // Halfway through the idle period, a second wallet window mounts — what an
  // unsolicited approval request produces.
  await new Promise((resolve) => setTimeout(resolve, IDLE_LOCK_MS / 2));
  await expect(popup.getByTestId('lock-password-input')).toHaveCount(0);
  const second = await context.newPage();
  await second.goto(`chrome-extension://${extensionId}/popup.html`);
  // Fully mounted — home, unlocked through the cached key — before it closes.
  await expect(second.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });
  await second.close();

  await expect(popup.getByTestId('lock-password-input')).toBeVisible({
    timeout: LOCK_DEADLINE_MS - (Date.now() - unlockedAt),
  });
  const lockedAfter = Date.now() - unlockedAt;
  // Not early either: the lock is the idle timer, not something else.
  expect(lockedAfter).toBeGreaterThan(IDLE_LOCK_MS - 30_000);
});
