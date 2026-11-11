import { createContext } from 'react';

/**
 * True inside `OnboardingLayout`'s action slot: `PrimaryButton` hands its fill
 * and label over between steps there (`actionHandover` in shared).
 */
export const OnboardingActionContext = createContext(false);
