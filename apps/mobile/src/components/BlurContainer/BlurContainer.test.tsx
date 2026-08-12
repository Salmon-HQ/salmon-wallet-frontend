import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import type { View } from 'react-native';

const mockBlurView = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
const mockUseBlurTarget = jest.fn();

jest.mock('@salmon/shared', () => ({
  colors: {
    background: { tokenItem: 'rgba(56, 63, 82, 0.1)' },
    border: { default: '#404962' },
  },
}));

jest.mock('expo-blur', () => ({
  BlurView: (props: { children?: React.ReactNode }) => mockBlurView(props),
}));

jest.mock('./BlurTargetContext', () => ({
  useBlurTarget: () => mockUseBlurTarget(),
}));

import { BlurContainer } from './BlurContainer';

describe('BlurContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBlurTarget.mockReturnValue({ current: {} as View });
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
  });

  it('uses BlurView with the Android blur target instead of a solid fallback surface', () => {
    render(
      <BlurContainer style={{ borderRadius: 12 }}>
        <>child</>
      </BlurContainer>
    );

    expect(mockBlurView).toHaveBeenCalledTimes(1);
    expect(mockBlurView.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        blurTarget: expect.objectContaining({ current: expect.any(Object) }),
        blurMethod: 'dimezisBlurView',
        blurReductionFactor: 1,
        intensity: 4,
        tint: 'dark',
        pointerEvents: 'none',
        style: expect.any(Array),
      })
    );
  });
});
