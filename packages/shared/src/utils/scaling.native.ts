/**
 * Responsive scaling on React Native: the window is read once, when the
 * module loads. The formulas and their documentation are in `scalingCore.ts`.
 */
import { Dimensions } from 'react-native';

import { createScalers, DESIGN_HEIGHT, DESIGN_WIDTH } from './scalingCore';

export { DESIGN_HEIGHT, DESIGN_WIDTH };

const window = Dimensions.get('window');

export const { s, vs, ms, mvs } = createScalers(() => window);
