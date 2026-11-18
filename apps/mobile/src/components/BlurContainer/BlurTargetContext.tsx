import { createContext, useContext, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';

const BlurTargetContext = createContext<RefObject<ViewInstance | null> | undefined>(undefined);

export const BlurTargetProvider = BlurTargetContext.Provider;

export function useBlurTarget(): RefObject<ViewInstance | null> | undefined {
  return useContext(BlurTargetContext);
}
