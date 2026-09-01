// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. Only the tokens PriceChart touches matter here.
jest.mock('@salmon/shared', () => ({
  ContentLoader: () => null,
  Rect: () => null,
  spacing: { xs: 4, sm: 8, screenGutter: 20 },
  borderRadius: { full: 999 },
  fontFamilyNative: { bold: 'Font-Bold' },
  fontWeight: { bold: '700' },
  isPositivePerformance: () => true,
  PRICE_CHART_PERIODS: ['1H', '1D', '1W', '1M', '3M', '1Y'],
  fontSize: { body: 16 },
  s: (size: number) => size,
  motionMs: { drift: 280, tide: 720 },
  opacity: { faint: 0.4, soft: 0.7, full: 1 },
  semantic: {
    status: { success: '#0f0', danger: '#f00' },
    accent: { tint: '#fee' },
    text: { accent: '#f88', primary: '#fff', secondary: '#aaa' },
    skeleton: { base: '#111', highlight: '#222' },
  },
  motionEasing: {
    current: { native: [0.32, 0.72, 0, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.14, 0.64, 1] },
  },
  resolveMotionMs: (ms: number, reduced: boolean) => (reduced ? 0 : ms),
}));

// The period selector is the kit's UnderlineTabs, whose own tokens the partial
// mock above does not carry; nothing here renders the selector.
jest.mock('../UnderlineTabs', () => ({ UnderlineTabs: () => null }));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedProps: (fn: () => unknown) => fn(),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    withRepeat: (value: unknown) => value,
    Easing: { bezier: () => () => 0 },
  };
});

import { resampleYs, buildLinePath } from './PriceChart';

const HEIGHT = 200;
const WIDTH = 300;

describe('PriceChart curve interpolation helpers', () => {
  test('resamples any series length to a fixed point count', () => {
    // Arrange
    const short = [
      { timestamp: 1, price: 10 },
      { timestamp: 2, price: 20 },
    ];
    const long = Array.from({ length: 500 }, (_, i) => ({ timestamp: i, price: i }));
    const bounds = { min: 0, max: 100 };

    // Act
    const shortYs = resampleYs(short, HEIGHT, bounds);
    const longYs = resampleYs(long, HEIGHT, bounds);

    // Assert — same length is what makes two periods interpolable
    expect(shortYs.length).toBe(longYs.length);
    expect(shortYs.length).toBeGreaterThan(1);
  });

  test('maps prices into chart coordinates (higher price = smaller y)', () => {
    // Arrange
    const rising = [
      { timestamp: 1, price: 0 },
      { timestamp: 2, price: 100 },
    ];

    // Act
    const ys = resampleYs(rising, HEIGHT, { min: 0, max: 100 });

    // Assert
    expect(ys[0]).toBe(HEIGHT);
    expect(ys[ys.length - 1]).toBe(0);
  });

  test('returns empty results for empty data', () => {
    expect(resampleYs([], HEIGHT, { min: 0, max: 0 })).toEqual([]);
    expect(buildLinePath([], WIDTH)).toBe('');
  });

  test('builds a path spanning the full chart width', () => {
    // Arrange
    const ys = resampleYs(
      [
        { timestamp: 1, price: 5 },
        { timestamp: 2, price: 7 },
        { timestamp: 3, price: 6 },
      ],
      HEIGHT,
      { min: 0, max: 10 }
    );

    // Act
    const path = buildLinePath(ys, WIDTH);

    // Assert
    expect(path.startsWith('M 0 ')).toBe(true);
    expect(path).toContain(`L ${WIDTH} `);
    expect(path).toContain('Q ');
  });
});
