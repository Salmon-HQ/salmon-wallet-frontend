import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => jest.requireActual('../../../test-utils/themeTokens'));

import { ValueActionsRow } from './ValueActionsRow';

describe('ValueActionsRow', () => {
  it('draws the text first and pins the controls to the trailing edge', () => {
    render(
      <ValueActionsRow
        testID="row"
        leading={<Text>+$1 · 2%</Text>}
        actions={<Text testID="control">send</Text>}
      />
    );
    expect(screen.getByText('+$1 · 2%')).toBeTruthy();
    expect(screen.getByTestId('row-actions').props.style).toEqual(
      expect.objectContaining({ marginLeft: 'auto' })
    );
  });

  it('draws no control group when there are no controls', () => {
    render(<ValueActionsRow testID="row" leading={<Text>only</Text>} />);
    expect(screen.queryByTestId('row-actions')).toBeNull();
  });
});
