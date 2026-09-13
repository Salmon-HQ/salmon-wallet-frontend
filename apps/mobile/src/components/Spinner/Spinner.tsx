/**
 * Spinner — mobile's small inline wait, the platform's own indicator in the
 * kit's ink. Sized like its DOM twin (`packages/ui/src/components/Spinner`,
 * a ring in points): the indicator only knows small and large, so the box
 * picks the variant.
 */
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SPINNER_DEFAULT_SIZE, SPINNER_LARGE_FROM } from '@salmon/shared';
import type { SpinnerProps } from './types';

export const Spinner: React.FC<SpinnerProps> = ({ color, size = SPINNER_DEFAULT_SIZE, testID }) => (
  <ActivityIndicator
    testID={testID}
    color={color}
    size={size >= SPINNER_LARGE_FROM ? 'large' : 'small'}
  />
);

export default Spinner;
