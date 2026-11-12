/**
 * Who asks (spec 043): the merchant's icon is drawn only over https, and the
 * globe takes its place the moment it fails.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  ...jest.requireActual('@salmon/shared/src/types/ui/transaction-confirmation'),
}));

jest.mock('expo-image', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => ReactActual.createElement(View, props),
  };
});

// The bubble and the row have their own suites; here they only lay out.
jest.mock('../IconBubble', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    IconBubble: ({ children, icon }: { children?: React.ReactNode; icon?: unknown }) =>
      ReactActual.createElement(
        View,
        { testID: icon ? 'requester-globe' : 'requester-bubble' },
        children
      ),
  };
});
jest.mock('../ListRow', () => {
  const ReactActual = require('react');
  const { Text, View } = require('react-native');
  return {
    ListRow: ({
      leading,
      title,
      subtitle,
      testID,
    }: {
      leading: React.ReactNode;
      title: string;
      subtitle: React.ReactNode;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        leading,
        ReactActual.createElement(Text, null, title),
        subtitle
      ),
  };
});
jest.mock('../../icons', () => ({ GlobeIcon: () => null }));

import { RequesterRow } from './RequesterRow';

describe('RequesterRow', () => {
  it('draws the merchant icon over https, with its label and domain', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <RequesterRow
        name="Corner Café"
        icon="https://merchant.example/logo.svg"
        domain="merchant.example"
      />
    );
    expect(getByTestId('requester-icon').props.source).toEqual({
      uri: 'https://merchant.example/logo.svg',
    });
    expect(getByText('Corner Café')).toBeTruthy();
    expect(getByTestId('requester-domain').props.children).toBe('merchant.example');
    expect(queryByTestId('requester-globe')).toBeNull();
  });

  it('never loads an http icon', () => {
    const { queryByTestId, getByTestId } = render(
      <RequesterRow
        name="Corner Café"
        icon="http://merchant.example/logo.png"
        domain="merchant.example"
      />
    );
    expect(queryByTestId('requester-icon')).toBeNull();
    expect(getByTestId('requester-globe')).toBeTruthy();
  });

  it('falls back to the globe when the icon fails to load', () => {
    const { getByTestId, queryByTestId } = render(
      <RequesterRow
        name="Corner Café"
        icon="https://merchant.example/logo.svg"
        domain="merchant.example"
      />
    );
    fireEvent(getByTestId('requester-icon'), 'error');
    expect(queryByTestId('requester-icon')).toBeNull();
    expect(getByTestId('requester-globe')).toBeTruthy();
  });

  it('shows the domain alone when the merchant gave no name', () => {
    const { getAllByText } = render(<RequesterRow domain="merchant.example" />);
    expect(getAllByText('merchant.example')).toHaveLength(2);
  });
});
