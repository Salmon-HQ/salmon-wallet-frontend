import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

const RAISED = '#161C2D';
const CREST = '#111624';
const THIN = 'rgba(11, 15, 25, 0.48)';
const THICK = 'rgba(11, 15, 25, 0.66)';

jest.mock('@salmon/shared', () => ({
  semantic: {
    surface: {
      raised: RAISED,
      crest: CREST,
      membraneThin: THIN,
      membraneThick: THICK,
    },
  },
}));

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

  it('the membrane field is retired — no field layer renders (2026-09-01)', () => {
    const { queryByTestId } = render(<Thermocline style={GEOMETRY} />);

    expect(queryByTestId('thermocline-field')).toBeNull();
  });

  it('ignores the deprecated refraction prop', () => {
    const { getByTestId, queryByTestId } = render(
      <Thermocline refraction={false} style={GEOMETRY} />
    );

    expect(getByTestId('thermocline-scrim')).toBeTruthy();
    expect(queryByTestId('thermocline-refraction')).toBeNull();
  });
});
