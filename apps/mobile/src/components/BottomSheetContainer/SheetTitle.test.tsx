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

  // The subtitle is the header's, never a loose line in the body.
  it('renders the subtitle under the title, centred in the secondary voice', () => {
    render(<SheetTitle subtitle="Drag to change the order.">Arrange tabs</SheetTitle>);

    const subtitle = screen.getByText('Drag to change the order.');
    expect(subtitle.props.style).toEqual(expect.objectContaining({ textAlign: 'center' }));
    const texts = screen.getAllByText(/Arrange tabs|Drag to change/).map((n) => n.props.children);
    expect(texts).toEqual(['Arrange tabs', 'Drag to change the order.']);
  });
});
