import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

import { SheetTitle } from './SheetTitle';

describe('SheetTitle', () => {
  it('renders the title text', () => {
    render(<SheetTitle>Select Token</SheetTitle>);

    expect(screen.getByText('Select Token')).toBeTruthy();
  });

  it('renders a leading element alongside the title', () => {
    render(<SheetTitle leading={<Text testID="leading-icon">!</Text>}>Confirm</SheetTitle>);

    expect(screen.getByTestId('leading-icon')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
  });
});
