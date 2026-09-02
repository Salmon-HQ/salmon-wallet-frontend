/**
 * @salmon/ui - Shared web UI package
 *
 * Provides React DOM + MUI components and utilities shared across web apps.
 */

// Components
export * from './components';

// Layouts

// Icons
export { IconDefaults, iconSize } from './icons';
export type { IconComponent, IconSizeToken } from './icons';

// Theme
export { createSalmonTheme, salmonTheme, salmonThemeFor } from './theme';
export {
  SalmonThemeProvider,
  useSemantic,
  useShadows,
  useSystemScheme,
  useThemeMode,
} from './theme/ThemeProvider';
export { applySemanticCssVars, semanticToCssVars } from './theme/cssVars';

// Motion — the DOM expression of the shared vocabulary
export { floatEntering, floatEnteringLight, sinkExiting, useReducedMotion } from './motion';
export type { SinkFloatOptions } from './motion';

// The shell's grip on the chrome, and the surfacing count Home floats on
export { TaskChromeProvider, useTaskChrome } from './contexts/TaskChromeContext';
export type { TaskChromeContextValue } from './contexts/TaskChromeContext';

// Utilities
export { styled } from './utils/styled';
export { visuallyHidden } from './utils/visuallyHidden';
export { injectKeyframes } from './utils/injectKeyframes';
export { usePressed } from './utils/usePressed';
