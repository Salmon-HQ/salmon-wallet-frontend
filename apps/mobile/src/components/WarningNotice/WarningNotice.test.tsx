/**
 * WarningNotice is an alert banner; what matters is that it announces as one
 * and that a call site can hook the specific instance it renders.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { WarningNotice } from './WarningNotice';

describe('WarningNotice', () => {
  it('announces itself as an alert', () => {
    render(<WarningNotice testID="warning" title="Something went wrong" />);

    expect(screen.getByTestId('warning').props.accessibilityRole).toBe('alert');
  });

  it('forwards testID to the banner it renders', () => {
    render(<WarningNotice testID="scan-failure-warning" title="Scan failed" />);

    expect(screen.getByTestId('scan-failure-warning')).toBeTruthy();
  });

  it('renders the action slot when one is passed', () => {
    render(
      <WarningNotice title="Stalled" action={<Text>Retry</Text>}>
        Body copy
      </WarningNotice>
    );

    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.getByText('Body copy')).toBeTruthy();
  });
});
