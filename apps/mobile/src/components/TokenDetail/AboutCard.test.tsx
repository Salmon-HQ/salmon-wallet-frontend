/**
 * AboutCard — the route's own decisions (loading vs description vs contract
 * row vs website row), not the kit primitives it composes.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  spacing: { md: 14, sm: 8 },
  fontFamilyNative: { bold: 'Font-Bold', regular: 'Font-Regular' },
  fontSize: { bodyLg: 16, body: 14 },
  lineHeight: { snug: 1.2, relaxed: 1.5 },
  s: (value: number) => value,
  vs: (value: number) => value,
  semantic: { text: { primary: '#fff', secondary: '#aaa' }, status: { success: '#0f0' } },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

jest.mock('../../../hooks/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    copied: false,
    scale: { value: 0 },
    trigger: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('../Card', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../IconBubble', () => ({ IconBubble: () => null }));

jest.mock('../ListRow', () => {
  const ReactActual = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ListRow: ({
      title,
      subtitle,
      onPress,
      testID,
    }: {
      title: string;
      subtitle?: string;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID, onPress },
        ReactActual.createElement(Text, null, title),
        subtitle ? ReactActual.createElement(Text, null, subtitle) : null
      ),
  };
});

jest.mock('../Skeleton', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    SkeletonRow: ({ testID }: { testID?: string }) => ReactActual.createElement(View, { testID }),
  };
});

import { AboutCard } from './AboutCard';

describe('AboutCard', () => {
  it('renders a skeleton row while loading', () => {
    render(<AboutCard loading />);
    expect(screen.getByTestId('token-detail-about')).toBeTruthy();
    expect(screen.queryByText('Contract Address')).toBeNull();
  });

  it('renders the description and the contract copy row', () => {
    render(
      <AboutCard
        description="Solana is a fast blockchain."
        contractAddress="So1111111111111111111111111111111111111111"
        contractAddressShort="So11…1111"
      />
    );

    expect(screen.getByText('Solana is a fast blockchain.')).toBeTruthy();
    const row = screen.getByTestId('token-detail-contract-address');
    expect(row).toBeTruthy();
    expect(screen.getByText('So11…1111')).toBeTruthy();
    expect(screen.queryByTestId('token-detail-website')).toBeNull();

    fireEvent.press(row);
  });

  it('renders nothing when there is nothing to show', () => {
    render(<AboutCard />);
    expect(screen.queryByTestId('token-detail-about')).toBeNull();
  });
});
