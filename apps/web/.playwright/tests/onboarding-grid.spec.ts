/**
 * The slot grid, measured — the load-bearing test for spec 013.
 *
 * The requirement is "the salmon mark, the title, the description and the
 * primary action are in the same place on every screen of the flow", and the
 * only honest way to check that is to render every screen at one viewport and
 * compare a rendered Y. A snapshot cannot express "identical across N screens"
 * — it passes happily while every screen drifts together.
 *
 * The invariant is **within a family**. `identity` (welcome, unlock, password,
 * success) draws the mark large and high; `content` (the seed screens, the
 * consent copy, the derived accounts list) hands the middle of the screen to
 * `body`. Both stacks are the same height, so the chrome, assist, secondary
 * and action bands are asserted **across both families** as well: that is what
 * stops the primary action moving anywhere in the flow.
 *
 * Run at two viewports and in two languages:
 *
 * - **400x956** — the extension side panel and the web app.
 * - **360x600** — the Chrome action popup. It is a degraded first-click state
 *   rather than a target surface (spec 013, decision 3), but the action has to
 *   stay reachable there, which is asserted separately below.
 * - **Spanish** exercises 15-25% expansion on every title and description.
 *
 * These screens are reachable directly by URL — `/auth/*` carries no guard —
 * so no wallet has to be created to measure them. Nothing here screenshots the
 * seed screens or reads a phrase: only geometry is collected.
 */
import { expect, test, type Page } from '@playwright/test';

type Variant = 'identity' | 'credential' | 'content';

interface Screen {
  readonly name: string;
  readonly path: string;
  readonly variant: Variant;
}

/**
 * Every screen reachable by URL alone. `/auth/*` carries no route guard.
 *
 * The password screen is deliberately absent: it holds the mnemonic in memory
 * only and redirects to the start of the flow when it has none, so it can only
 * be measured by walking the recover path — which the last test here does,
 * when a test seed is configured.
 */
const SCREENS: readonly Screen[] = [
  { name: 'welcome', path: '/auth/select', variant: 'identity' },
  { name: 'success', path: '/auth/success', variant: 'identity' },
  { name: 'lock', path: '/lock', variant: 'credential' },
  { name: 'seed-warning', path: '/auth/create', variant: 'content' },
  { name: 'recover', path: '/auth/recover', variant: 'content' },
  { name: 'analytics-consent', path: '/auth/analytics-consent', variant: 'content' },
  { name: 'derived-accounts', path: '/auth/derived', variant: 'content' },
];

/**
 * Slots whose Y must agree across *every* screen, in every family.
 *
 * These are the control bands. The three families spend their differences
 * between the top of the stack and `body` — a family that reserves less body
 * hands the difference back above the mark — and the differences cancel, so
 * everything from `assist` down lands at one Y on all of them. `title` and
 * `description` are *not* here: they sit below the mark, whose band is exactly
 * what the families differ by on purpose.
 */
const SHARED_SLOTS = ['chrome', 'assist', 'secondary', 'action'] as const;

/** Slots that also agree, but only within one family. */
const FAMILY_SLOTS = [...SHARED_SLOTS, 'mark', 'description', 'body'] as const;

const VIEWPORTS = [
  { name: 'panel', width: 400, height: 956 },
  { name: 'popup', width: 360, height: 600 },
] as const;

type Tops = Record<string, number>;

/** Recorded for a slot the degradation ladder dropped at this viewport. */
const ABSENT = -1;

async function measure(page: Page): Promise<Tops> {
  await page.getByTestId('onboarding-stack').waitFor({ state: 'visible' });

  const tops: Tops = {};
  for (const slot of FAMILY_SLOTS) {
    const locator = page.getByTestId(`onboarding-slot-${slot}`);
    // A slot the degradation ladder dropped is absent by design. Record the
    // absence rather than waiting for it, so the comparison catches a screen
    // that dropped one while its siblings kept it — which is the defect — and
    // does not merely time out.
    const box = (await locator.count()) ? await locator.boundingBox() : null;
    tops[slot] = box ? Math.round(box.y) : ABSENT;
  }
  return tops;
}

async function slotTops(page: Page, screen: Screen): Promise<Tops> {
  await page.goto(screen.path);
  return measure(page);
}

for (const viewport of VIEWPORTS) {
  test.describe(`slot grid @ ${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const locale of ['en-US', 'es-AR'] as const) {
      test.describe(`locale ${locale}`, () => {
        test.use({ locale });

        test('every screen of a family puts every slot at the same Y', async ({ page }) => {
          const measured = new Map<string, Tops>();
          for (const screen of SCREENS) {
            measured.set(screen.name, await slotTops(page, screen));
          }

          for (const variant of ['identity', 'credential', 'content'] as const) {
            const family = SCREENS.filter((screen) => screen.variant === variant);
            if (family.length < 2) continue;
            const reference = measured.get(family[0].name)!;

            for (const screen of family.slice(1)) {
              const tops = measured.get(screen.name)!;
              for (const slot of FAMILY_SLOTS) {
                expect(
                  tops[slot],
                  `${variant}: ${screen.name}.${slot} against ${family[0].name}.${slot}`
                ).toBe(reference[slot]);
              }
            }
          }

          // And the bands both families share. This is the one the request is
          // actually about: the primary action's top edge, identical on all of
          // them. It used to span 284px on web.
          const reference = measured.get(SCREENS[0].name)!;
          for (const screen of SCREENS.slice(1)) {
            const tops = measured.get(screen.name)!;
            for (const slot of SHARED_SLOTS) {
              expect(tops[slot], `${screen.name}.${slot} across families`).toBe(reference[slot]);
            }
          }
        });

        test('the password screen agrees with the unlock screen it will be checked against', async ({
          page,
        }) => {
          // The one screen that cannot be reached by URL: it holds the phrase
          // in memory and sends the user back to the start when it has none.
          // Walk the recover path to it. The seed comes from the gitignored
          // `.env.test` and is never printed, asserted on, or screenshotted.
          const seed = process.env.SALMON_TEST_SEED_A ?? '';
          test.skip(seed === '', 'SALMON_TEST_SEED_A not configured in .env.test');

          await page.goto('/lock');
          const lock = await measure(page);

          await page.goto('/auth/recover');
          await page.getByTestId('recover-word-input-1').fill(seed);
          await page.getByTestId('recover-next-button').click();
          await page.getByTestId('password-input').waitFor({ state: 'visible' });
          const password = await measure(page);

          for (const slot of FAMILY_SLOTS) {
            expect(password[slot], `password.${slot} against lock.${slot}`).toBe(lock[slot]);
          }
        });

        test('the primary action is on screen and reachable without scrolling', async ({
          page,
        }) => {
          // What FR-012 is for. The popup clips its overflow rather than
          // scrolling it, so an action past the fold would be unreachable, not
          // merely inconvenient.
          for (const screen of SCREENS) {
            await page.goto(screen.path);
            await page.getByTestId('onboarding-stack').waitFor({ state: 'visible' });
            const box = await page.getByTestId('onboarding-slot-action').boundingBox();
            expect(box, `${screen.name}: action band`).not.toBeNull();
            expect(box!.y + box!.height, `${screen.name}: action bottom`).toBeLessThanOrEqual(
              viewport.height + 1
            );
            expect(box!.y, `${screen.name}: action top`).toBeGreaterThanOrEqual(0);
          }
        });
      });
    }
  });
}
