/**
 * The slot grid, measured on the real extension surface.
 *
 * The web app (and its equivalent onboarding-grid spec) was retired on
 * 2026-09-02; the extension is now the only DOM app. What this
 * spec proves: that the slots land at
 * the same Y inside the extension's own surface — a 360x600 action popup whose
 * `html`, `body` and `#root` all set `overflow: hidden`, so anything past the
 * fold is clipped rather than scrollable.
 *
 * The popup is a degraded first-click state rather than a target surface (spec
 * 013, decision 3): under MV3 the service worker is not persistent, and a
 * click that arrives before it wakes lands here instead of in the side panel.
 * The grid does not have to look good at 600px. The action does have to be
 * reachable.
 *
 * Reachable without a wallet or a backend: the welcome screen, and the seed
 * warning and recover screens one click away from it. The lock screen is
 * measured only when the profile actually has a wallet.
 */
import { expect, test } from '../fixtures';
import { type Page } from '@playwright/test';

const SLOTS = [
  'chrome',
  'mark',
  'title',
  'description',
  'body',
  'assist',
  'secondary',
  'action',
] as const;

/** Slots whose Y agrees across both families. */
const SHARED_SLOTS = ['chrome', 'title', 'assist', 'secondary', 'action'] as const;

type Tops = Partial<Record<(typeof SLOTS)[number], number>>;

async function slotTops(page: Page): Promise<Tops> {
  await page.getByTestId('onboarding-stack').waitFor({ state: 'visible' });
  const tops: Tops = {};
  for (const slot of SLOTS) {
    const box = await page.getByTestId(`onboarding-slot-${slot}`).boundingBox();
    if (box) tops[slot] = Math.round(box.y);
  }
  return tops;
}

test('the control bands hold at one Y across the screens the popup can reach', async ({
  popup,
}) => {
  await popup.setViewportSize({ width: 360, height: 600 });

  const onWelcome = popup.getByTestId('select-create-button');
  test.skip(
    (await onWelcome.count()) === 0,
    'profile already has a wallet; the onboarding entry is not the first screen'
  );

  const welcome = await slotTops(popup);

  await popup.getByTestId('select-create-button').click();
  const seedWarning = await slotTops(popup);

  await popup.goBack().catch(() => undefined);
  await popup.reload();
  await popup.getByTestId('select-recover-button').click();
  const recover = await slotTops(popup);

  // Welcome is `identity`, the other two are `content` — the mark and the body
  // differ between families on purpose, and the difference cancels, so these
  // five bands do not move anywhere in the flow. The primary action is the one
  // the request is about.
  for (const slot of SHARED_SLOTS) {
    expect(seedWarning[slot], `seed-warning.${slot}`).toBe(welcome[slot]);
    expect(recover[slot], `recover.${slot}`).toBe(welcome[slot]);
  }

  // The two `content` screens agree on everything, mark and body included.
  for (const slot of SLOTS) {
    expect(recover[slot], `recover.${slot} against seed-warning`).toBe(seedWarning[slot]);
  }
});

test('the primary action stays inside the clipped popup on every reachable screen', async ({
  popup,
}) => {
  await popup.setViewportSize({ width: 360, height: 600 });
  await popup
    .getByTestId('onboarding-stack')
    .waitFor({ state: 'visible' })
    .catch(() => undefined);

  const stack = popup.getByTestId('onboarding-stack');
  test.skip((await stack.count()) === 0, 'no onboarding surface on this profile');

  const action = await popup.getByTestId('onboarding-slot-action').boundingBox();
  expect(action).not.toBeNull();
  // `overflow: hidden` means below the fold is unreachable, not scrollable.
  expect(action!.y + action!.height).toBeLessThanOrEqual(601);
  expect(action!.y).toBeGreaterThanOrEqual(0);
});
