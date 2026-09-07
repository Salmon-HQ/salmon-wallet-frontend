/**
 * The lock screen's two guarantees, which no amount of redesign may weaken:
 * it covers the whole app, and nothing behind it can be touched.
 *
 * The gate used to make these promises through a state machine that also drove
 * settings and the wallet switcher, and that is exactly how a locked wallet
 * once ended up with a tappable "Private Key" row beside the password prompt.
 * The overlay has one job, so the guarantees are one assertion each.
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { LockOverlay } from './LockOverlay';

describe('LockOverlay', () => {
  it('fully covers whatever is behind it', () => {
    const { getByTestId } = render(
      <LockOverlay>
        <Text>Password</Text>
      </LockOverlay>
    );

    const overlay = getByTestId('lock-overlay');
    const style = Object.assign({}, ...[overlay.props.style].flat(Infinity).filter(Boolean));

    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
    expect(style.right).toBe(0);
    expect(style.bottom).toBe(0);
    // Above every plane the shell paints — the water, the tab content, the
    // header row, and any sheet that was open when the lock landed.
    expect(style.zIndex).toBeGreaterThanOrEqual(1000);
  });

  it('swallows every touch while locked', () => {
    const { getByTestId } = render(
      <LockOverlay>
        <Text>Password</Text>
      </LockOverlay>
    );

    // `auto`, never `box-none`: box-none lets a press through to whatever the
    // overlay is covering, which is the wallet.
    expect(getByTestId('lock-overlay').props.pointerEvents).toBe('auto');
  });

  it('renders the lock content it is given', () => {
    const { getByText } = render(
      <LockOverlay>
        <Text>Password</Text>
      </LockOverlay>
    );

    expect(getByText('Password')).toBeTruthy();
  });
});
