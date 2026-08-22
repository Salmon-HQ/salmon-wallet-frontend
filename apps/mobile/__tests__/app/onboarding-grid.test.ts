/**
 * Every onboarding screen composes on the grid, and none of them re-derives it.
 *
 * `OnboardingLayout.test.tsx` proves the grid holds its slots still. This
 * proves the screens actually use it — which is the half a component test
 * cannot see, and the half that regresses: the flow got into its measured
 * state (six mark sizes across a 316px band, four bottom-action strategies on
 * mobile alone) precisely because each new screen built its own container.
 *
 * A source-level check rather than nine renders, because nine renders means
 * nine sets of data mocks that would then need maintaining for a fact that is
 * visible in one grep.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const AUTH_DIR = join(__dirname, '../../app/(auth)');

const screens = readdirSync(AUTH_DIR)
  .filter((file) => file.endsWith('.tsx') && file !== '_layout.tsx')
  .sort();

const read = (file: string) => readFileSync(join(AUTH_DIR, file), 'utf8');

describe('the (auth) screens', () => {
  it('is the flow this spec covers, and nothing has been quietly added', () => {
    expect(screens).toEqual([
      'analytics-consent.tsx',
      'biometric-setup.tsx',
      'create.tsx',
      'derived-accounts.tsx',
      'index.tsx',
      'password.tsx',
      'recover.tsx',
      'seed-warning.tsx',
      'success.tsx',
    ]);
  });

  it.each(screens)('%s composes on OnboardingLayout', (file) => {
    expect(read(file)).toContain('<OnboardingLayout');
  });

  it.each(screens)('%s does not build a container of its own', (file) => {
    const source = read(file);
    // The four bottom-action strategies the layout audit found, and the
    // per-screen safe area that let each of them exist.
    expect(source).not.toContain('SafeAreaView');
    expect(source).not.toMatch(/marginTop: 'auto'/);
    expect(source).not.toMatch(/flexGrow: 1,\s*\n\s*paddingHorizontal/);
  });

  it('index.tsx draws the welcome mark at the grid’s own size — the lock is the reference', () => {
    // The 96pt `WELCOME_MARK_SIZE` override is gone (owner, 2026-08-18): the
    // welcome fish and the lock fish are the same fish at the same Y, and
    // parity comes from the shared grid constant, not a local number.
    const source = read('index.tsx');
    expect(source).toContain('onboardingIdentityGridFull.markSize');
    expect(source).not.toContain('WELCOME_MARK_SIZE');
  });

  it.each(screens)('%s draws the mark from the vector, never from Logo.png', (file) => {
    // `Logo` is the 197x183 raster with a near-white `#FCFCFC` baked into it.
    // The grid's mark is `markPaths`, tinted from a token, drawn by the layout.
    expect(read(file)).not.toContain("from '@salmon/assets'");
  });

  it.each(screens)('%s sets no title or description type of its own', (file) => {
    // One title token and one description token across the whole flow. The
    // hardcoded 24/28/32/36 sizes and their three line-heights are gone.
    const source = read(file);
    expect(source).not.toMatch(/fontSize: (24|28|32|36),/);
    expect(source).not.toMatch(/lineHeight: (32|36|40),/);
  });
});
