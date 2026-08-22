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
      membraneFieldStroke: 'rgba(7, 9, 17, 0.45)',
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

  describe('the membrane field', () => {
    it('is one continuous dark field — the membrane variant, edge to edge, no container opacity', () => {
      const { getByTestId } = render(<Thermocline style={GEOMETRY} />);

      const field = getByTestId('thermocline-field');
      const style = StyleSheet.flatten(field.props.style);
      // Subtlety lives in the ink's alpha, not a second knob on the container.
      expect(style.opacity).toBeUndefined();
      // Full-surface: absoluteFill, no height cap.
      expect(style.top).toBe(0);
      expect(style.bottom).toBe(0);
      expect(within(field).getByTestId('scales-background').props.variant).toBe('membrane');
    });

    it('has no separate refraction strip — a brighter top band broke the material (owner, 2026-08-19)', () => {
      const { queryByTestId } = render(<Thermocline style={GEOMETRY} />);

      expect(queryByTestId('thermocline-refraction')).toBeNull();
    });

    it('ignores the deprecated refraction prop', () => {
      const { getByTestId, queryByTestId } = render(
        <Thermocline refraction={false} style={GEOMETRY} />
      );

      expect(getByTestId('thermocline-field')).toBeTruthy();
      expect(queryByTestId('thermocline-refraction')).toBeNull();
    });

    it('is texture, not transparency — it survives the opaque rung', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);

      const { getByTestId, queryByTestId } = render(<Thermocline style={GEOMETRY} />);

      await waitFor(() => expect(queryByTestId('thermocline-opaque')).toBeTruthy());
      expect(getByTestId('thermocline-field')).toBeTruthy();
    });
  });
});
