/**
 * One owner for the bottom safe-area inset per screen.
 *
 * A SafeAreaView with a bottom edge (directly, or through
 * `SettingsScreenLayout`) already lifts the content above the system bar. An
 * action row inside it that reads `floatingBottomOffset` (inset + 20) adds the
 * inset a second time, and the button floats far above the floor — on Android
 * three-button navigation, 48 too high. Such a row reads
 * `screenActionBottomPadding` instead (`hooks/useTabChrome.ts`). This guard
 * reads the source, so the double count fails here rather than on a device.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function sources(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.|__tests__/.test(file))
    .map((file) => path.join(dir, file));
}

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');

/** A SafeAreaView whose `edges` name the bottom one, or the layout that draws one. */
const OWNS_BOTTOM_INSET = /edges=\{\[[^\]]*['"]bottom['"]|<SettingsScreenLayout\b/;

describe('the bottom safe-area inset has one owner', () => {
  const files = [...sources('app'), ...sources('src')];

  it('finds the screens it guards', () => {
    expect(files.filter((file) => OWNS_BOTTOM_INSET.test(read(file))).length).toBeGreaterThan(5);
  });

  it.each(files.filter((file) => OWNS_BOTTOM_INSET.test(read(file))))(
    '%s does not add the inset again under its own bottom edge',
    (file) => {
      expect(read(file)).not.toMatch(/floatingBottomOffset/);
    }
  );

  // The rows that used to count it twice, each pinned to the in-safe-area value.
  it.each([
    'app/(app)/send/index.tsx',
    'app/(app)/send/amount.tsx',
    'app/(app)/send/review.tsx',
    'app/(app)/nft/[id]/index.tsx',
    'app/(app)/nft/[id]/send.tsx',
    'app/(app)/nft/[id]/review.tsx',
    'app/(app)/nft/[id]/burn.tsx',
    // Hosted only by the two success screens, both inside a bottom edge.
    'src/components/ReceiptScreen/TransferReceipt.tsx',
  ])('%s spaces its action row with screenActionBottomPadding', (file) => {
    expect(read(file)).toMatch(/screenActionBottomPadding/);
    expect(read(file)).not.toMatch(/floatingBottomOffset/);
  });

  // The reference the rows match: Home's Powerups button owns the inset itself.
  it("keeps Home's Powerups button on floatingBottomOffset", () => {
    expect(read('app/(app)/(tabs)/index.tsx')).toMatch(/bottomOffset=\{floatingBottomOffset\}/);
  });

  // Full-screen hosts with no bottom edge own the inset themselves and sit at
  // the Powerups button's height, not at a spacing of their own.
  it.each([
    'src/components/TransactionConfirmation/ConfirmationHost.tsx',
    'src/mwa/MwaRequest.tsx',
  ])('%s lifts its confirmation by floatingBottomOffset', (file) => {
    expect(read(file)).toMatch(/paddingBottom: floatingBottomOffset/);
    expect(read(file)).not.toMatch(/insets\.bottom \+/);
  });

  it('keeps the exchange receipt’s actions at screenBottom over its own inset', () => {
    const receipt = read('src/components/ReceiptScreen/ExchangeReceipt.tsx');
    expect(receipt).toMatch(/paddingBottom: insets\.bottom/);
    expect(receipt).toMatch(/paddingBottom: vs\(spacing\.screenBottom\)/);
  });
});
