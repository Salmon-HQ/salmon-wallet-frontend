import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-qrcode-svg', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return (props: Record<string, unknown>) =>
    ReactActual.createElement(View, { ...props, testID: 'svg' });
});
jest.mock('../BrandMark', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    BrandMark: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'brand-mark' }),
  };
});

import QRCode from './QRCode';

describe('QRCode brand knockout', () => {
  it('draws nothing over a plain code', () => {
    render(<QRCode testID="qr" value="x" size={100} />);
    expect(screen.getByTestId('svg').props.ecl).toBe('M');
    expect(screen.queryByTestId('qr-logo')).toBeNull();
  });

  it('centres the mark on a knockout in the code ground and forces level H', () => {
    render(<QRCode testID="qr" value="x" size={100} backgroundColor="#111" brandKnockout />);
    expect(screen.getByTestId('svg').props.ecl).toBe('H');
    const knockout = screen.getByTestId('qr-logo');
    expect(knockout).toBeTruthy();
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
  });
});
