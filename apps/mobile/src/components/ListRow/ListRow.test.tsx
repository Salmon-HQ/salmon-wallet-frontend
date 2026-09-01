/**
 * The row's accessible name is what Maestro and a screen reader both land on,
 * and it has to carry the subtitle: two recipients with the same name are
 * told apart only by the address underneath.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { ListRow } from './ListRow';

describe('ListRow', () => {
  it('renders leading, title, subtitle and trailing, and presses', () => {
    const onPress = jest.fn();
    render(
      <ListRow
        testID="recipient-row"
        leading={<Text>L</Text>}
        title="Ana"
        subtitle="9xQe…4f2"
        trailing={<Text>12 SOL</Text>}
        onPress={onPress}
      />
    );

    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('9xQe…4f2')).toBeTruthy();
    expect(screen.getByText('12 SOL')).toBeTruthy();

    fireEvent.press(screen.getByTestId('recipient-row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('names itself with the subtitle so identical titles stay distinguishable', () => {
    render(<ListRow leading={<Text>L</Text>} title="Ana" subtitle="9xQe…4f2" onPress={jest.fn()} />);

    expect(screen.getByLabelText('Ana, 9xQe…4f2')).toBeTruthy();
  });
});
