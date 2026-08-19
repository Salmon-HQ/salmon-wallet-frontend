import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';

const RAISED = '#161C2D';
const CREST = '#111624';
const THIN = 'rgba(11, 15, 25, 0.62)';
const THICK = 'rgba(11, 15, 25, 0.80)';

jest.mock('@salmon/shared', () => ({
  semantic: {
    surface: {
      raised: RAISED,
      crest: CREST,
      membraneThin: THIN,
      membraneThick: THICK,
    },
    scales: {
      refractionScale: 0.5,
      refractionOpacity: 0.08,
      refractionHeight: 24,
      refractionSweep: ['#9FE0EF', '#FF9E8B', '#7BEFCB'],
    },
  },
}));

// jest-expo auto-mocks native modules, so the glass probe has to be driven
// explicitly to exercise each rung of the degradation ladder.
let mockGlassAvailable = false;

jest.mock('expo-glass-effect', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    GlassView: ({ children, ...props }: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'glass-view' }, children),
    isGlassEffectAPIAvailable: () => mockGlassAvailable,
    isLiquidGlassAvailable: () => mockGlassAvailable,
  };
});

jest.mock('../BlurContainer', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BlurContainer: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'blur-container' }),
    useBlurTarget: () => undefined,
    BlurTargetProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('../ScalesBackground', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ScalesBackground: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'scales-background' }),
  };
});

// The debug switch, made mutable so each variant can be exercised.
let mockVariant: 'glass' | 'opaque' | 'tint' = 'glass';
jest.mock('../../debug/thermoclineVariant', () => ({
  get thermoclineVariant() {
    return mockVariant;
  },
}));

import { Thermocline } from './Thermocline.native';

// The tab bar's geometry: `componentSizes.tabBarRadius` (the control radius,
// 12 — a control, not a pill; pinned in shared's `controlRadius.test.ts`).
const GEOMETRY = { borderRadius: 12 };

// `Platform.OS` / `Platform.Version` mix plain values and getters across RN
// versions, so they are re-defined directly and restored from the saved
// descriptors after each Android test.
const PLATFORM_DESCRIPTORS = {
  OS: Object.getOwnPropertyDescriptor(Platform, 'OS')!,
  Version: Object.getOwnPropertyDescriptor(Platform, 'Version')!,
};

function mockPlatform(os: 'ios' | 'android', version: number) {
  Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
  Object.defineProperty(Platform, 'Version', { get: () => version, configurable: true });
}

function restorePlatform() {
  Object.defineProperty(Platform, 'OS', PLATFORM_DESCRIPTORS.OS);
  Object.defineProperty(Platform, 'Version', PLATFORM_DESCRIPTORS.Version);
}

describe('Thermocline', () => {
  beforeEach(() => {
    mockVariant = 'glass';
    mockGlassAvailable = false;
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: () => {},
    } as ReturnType<typeof AccessibilityInfo.addEventListener>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('iOS without liquid glass takes the blur rung, scrim as its own fill', () => {
    const { getByTestId } = render(<Thermocline surface="chrome" tier="thick" style={GEOMETRY} />);

    expect(getByTestId('blur-container').props.backgroundColor).toBe(THICK);
  });

  it('iOS with liquid glass takes rung 1, with the scrim painted inside it', () => {
    mockGlassAvailable = true;

    const { getByTestId } = render(<Thermocline surface="chrome" style={GEOMETRY} />);

    expect(getByTestId('glass-view')).toBeTruthy();
    const scrim = StyleSheet.flatten(getByTestId('thermocline-scrim').props.style);
    expect(scrim.backgroundColor).toBe(THIN);
  });

  it('the thin tier scrims with membraneThin on the blur rung', () => {
    const { getByTestId } = render(<Thermocline surface="chrome" tier="thin" style={GEOMETRY} />);

    expect(getByTestId('blur-container').props.backgroundColor).toBe(THIN);
  });

  it('Reduce Transparency collapses to the opaque plane without moving layout', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

    const { queryByTestId, getByTestId, toJSON } = render(
      <Thermocline surface="sheet" tier="thick" style={GEOMETRY} />
    );

    await waitFor(() => expect(queryByTestId('blur-container')).toBeNull());

    const opaque = StyleSheet.flatten(getByTestId('thermocline-opaque').props.style);
    // thick → the nearest opaque plane is `surface.crest`.
    expect(opaque.backgroundColor).toBe(CREST);
    // Rung 5 must not move the layout by a pixel.
    const root = StyleSheet.flatten(toJSON()?.props.style);
    expect(root.borderRadius).toBe(GEOMETRY.borderRadius);
  });

  it('thin tier collapses to surface.raised on the opaque rung', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

    const { getByTestId, queryByTestId } = render(
      <Thermocline surface="chrome" tier="thin" style={GEOMETRY} />
    );

    await waitFor(() => expect(queryByTestId('blur-container')).toBeNull());
    const opaque = StyleSheet.flatten(getByTestId('thermocline-opaque').props.style);
    expect(opaque.backgroundColor).toBe(RAISED);
  });

  describe('Android stays faithful to its platform', () => {
    afterEach(() => {
      restorePlatform();
    });

    it('a sheet on SDK 31+ blurs', () => {
      mockPlatform('android', 33);

      const { getByTestId } = render(<Thermocline surface="sheet" tier="thick" style={GEOMETRY} />);

      expect(getByTestId('blur-container')).toBeTruthy();
    });

    it('chrome never blurs — the tab bar lands on the opaque rung', () => {
      mockPlatform('android', 33);

      const { queryByTestId, getByTestId } = render(
        <Thermocline surface="chrome" tier="thick" style={GEOMETRY} />
      );

      expect(queryByTestId('blur-container')).toBeNull();
      expect(getByTestId('thermocline-opaque')).toBeTruthy();
    });

    it('below SDK 31 even a sheet lands on the opaque rung', () => {
      mockPlatform('android', 30);

      const { queryByTestId, getByTestId } = render(
        <Thermocline surface="sheet" tier="thick" style={GEOMETRY} />
      );

      expect(queryByTestId('blur-container')).toBeNull();
      expect(getByTestId('thermocline-opaque')).toBeTruthy();
    });
  });

  describe('the debug variant switch', () => {
    it("'opaque' renders rung 5 as the identity", () => {
      mockVariant = 'opaque';

      const { getByTestId, queryByTestId } = render(
        <Thermocline surface="chrome" tier="thin" style={GEOMETRY} />
      );

      expect(queryByTestId('blur-container')).toBeNull();
      const opaque = StyleSheet.flatten(getByTestId('thermocline-opaque').props.style);
      expect(opaque.backgroundColor).toBe(RAISED);
    });

    it("'tint' renders the translucent ink without blur — the floor never varies", () => {
      mockVariant = 'tint';

      const { getByTestId, queryByTestId } = render(
        <Thermocline surface="chrome" tier="thick" style={GEOMETRY} />
      );

      expect(queryByTestId('blur-container')).toBeNull();
      const scrim = StyleSheet.flatten(getByTestId('thermocline-scrim').props.style);
      expect(scrim.backgroundColor).toBe(THICK);
    });

    it('the OS Reduce Transparency signal outranks the variant', async () => {
      mockVariant = 'tint';
      jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

      const { queryByTestId } = render(<Thermocline surface="chrome" style={GEOMETRY} />);

      await waitFor(() => expect(queryByTestId('thermocline-opaque')).toBeTruthy());
    });
  });

  describe('the refraction strip', () => {
    it('is part of the material, mounted by default on every rung', () => {
      const { getByTestId } = render(<Thermocline surface="chrome" style={GEOMETRY} />);

      const band = getByTestId('thermocline-refraction');
      const style = StyleSheet.flatten(band.props.style);
      expect(style.height).toBe(24);
      expect(style.opacity).toBe(0.08);
      expect(getByTestId('scales-background').props.variant).toBe('refraction');
    });

    it('stays mounted on the opaque rung', () => {
      mockVariant = 'opaque';

      const { getByTestId } = render(<Thermocline surface="chrome" style={GEOMETRY} />);

      expect(getByTestId('thermocline-refraction')).toBeTruthy();
    });

    it('can be turned off where a surface has no top edge to refract', () => {
      const { queryByTestId } = render(
        <Thermocline surface="chrome" refraction={false} style={GEOMETRY} />
      );

      expect(queryByTestId('thermocline-refraction')).toBeNull();
    });
  });
});
