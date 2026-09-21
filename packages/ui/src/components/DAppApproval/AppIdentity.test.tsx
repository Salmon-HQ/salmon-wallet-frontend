/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { AppIdentity } from './AppIdentity';

const PADDED_HOSTNAME = 'wallet.salmon.io.secure-login.attacker.example';

describe('AppIdentity', () => {
  afterEach(() => {
    cleanup();
  });

  // The name and the icon are chosen by the site; the hostname is the only
  // thing on the screen it cannot choose. The part that decides who the
  // counterparty is sits at its end, so an ellipsis there hides exactly the
  // evidence the user is there to check.
  it('states the whole hostname, tail included', () => {
    render(<AppIdentity appName="Salmon Wallet" displayOrigin={PADDED_HOSTNAME} />);

    const origin = screen.getByTestId('dapp-origin');
    expect(origin).toHaveTextContent(PADDED_HOSTNAME);
    expect(origin).toHaveStyle({ overflowWrap: 'anywhere' });
    expect(origin).not.toHaveStyle({ textOverflow: 'ellipsis' });
  });

  it('states it even when the site sent no name', () => {
    render(<AppIdentity displayOrigin={PADDED_HOSTNAME} />);

    expect(screen.getByTestId('dapp-origin')).toHaveTextContent(PADDED_HOSTNAME);
  });
});
