import React from 'react';
import { render, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

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
      membraneFieldOpacity: 0.04,
    },
  },
}));

jest.mock('../ScalesBackground', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ScalesBackground: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'scales-background' }),
  };
});

import { Thermocline } from './Thermocline.native';

// The tab bar's geometry: `componentSizes.tabBarRadius` (the control radius,
// 12 — a control, not a pill; pinned in shared's `controlRadius.test.ts`).
const GEOMETRY = { borderRadius: 12 };

describe('Thermocline', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: () => {},
    } as ReturnType<typeof AccessibilityInfo.addEventListener>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the tint — the translucent ink, membraneThick for the thick tier', () => {
    const { getByTestId } = render(<Thermocline tier="thick" style={GEOMETRY} />);

    const scrim = StyleSheet.flatten(getByTestId('thermocline-scrim').props.style);
    expect(scrim.backgroundColor).toBe(THICK);
  });

  it('the thin tier tints with membraneThin', () => {
    const { getByTestId } = render(<Thermocline tier="thin" style={GEOMETRY} />);

    const scrim = StyleSheet.flatten(getByTestId('thermocline-scrim').props.style);
    expect(scrim.backgroundColor).toBe(THIN);
  });

  it('Reduce Transparency collapses to the opaque plane without moving layout', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

    const { queryByTestId, getByTestId, toJSON } = render(
      <Thermocline tier="thick" style={GEOMETRY} />
    );

    await waitFor(() => expect(queryByTestId('thermocline-opaque')).toBeTruthy());

    const opaque = StyleSheet.flatten(getByTestId('thermocline-opaque').props.style);
    // thick → the nearest opaque plane is `surface.crest`.
    expect(opaque.backgroundColor).toBe(CREST);
    // The opaque rung must not move the layout by a pixel.
    const root = StyleSheet.flatten(toJSON()?.props.style);
    expect(root.borderRadius).toBe(GEOMETRY.borderRadius);
  });

  it('thin tier collapses to surface.raised on the opaque rung', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

    const { getByTestId, queryByTestId } = render(<Thermocline tier="thin" style={GEOMETRY} />);

    await waitFor(() => expect(queryByTestId('thermocline-opaque')).toBeTruthy());
    const opaque = StyleSheet.flatten(getByTestId('thermocline-opaque').props.style);
    expect(opaque.backgroundColor).toBe(RAISED);
  });

  describe('the refraction strip', () => {
    it('is part of the material, mounted by default', () => {
      const { getByTestId } = render(<Thermocline style={GEOMETRY} />);

      const band = getByTestId('thermocline-refraction');
      const style = StyleSheet.flatten(band.props.style);
      expect(style.height).toBe(24);
      expect(style.opacity).toBe(0.08);
      expect(within(band).getByTestId('scales-background').props.variant).toBe('refraction');
    });

    it('stays mounted on the opaque rung', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

      const { getByTestId, queryByTestId } = render(<Thermocline style={GEOMETRY} />);

      await waitFor(() => expect(queryByTestId('thermocline-opaque')).toBeTruthy());
      expect(getByTestId('thermocline-refraction')).toBeTruthy();
    });

    it('can be turned off where a surface has no top edge to refract', () => {
      const { queryByTestId } = render(<Thermocline refraction={false} style={GEOMETRY} />);

      expect(queryByTestId('thermocline-refraction')).toBeNull();
    });
  });

  describe('the membrane field', () => {
    it('covers the whole surface at half the strip opacity', () => {
      const { getByTestId } = render(<Thermocline style={GEOMETRY} />);

      const field = getByTestId('thermocline-field');
      const style = StyleSheet.flatten(field.props.style);
      expect(style.opacity).toBe(0.04);
      // Full-surface: absoluteFill, no height cap.
      expect(style.top).toBe(0);
      expect(style.bottom).toBe(0);
      expect(within(field).getByTestId('scales-background').props.variant).toBe('refraction');
    });

    it('is texture, not transparency — it survives the opaque rung', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

      const { getByTestId, queryByTestId } = render(<Thermocline style={GEOMETRY} />);

      await waitFor(() => expect(queryByTestId('thermocline-opaque')).toBeTruthy());
      expect(getByTestId('thermocline-field')).toBeTruthy();
    });

    it('stays mounted when the strip is turned off', () => {
      const { getByTestId } = render(<Thermocline refraction={false} style={GEOMETRY} />);

      expect(getByTestId('thermocline-field')).toBeTruthy();
    });
  });
});
