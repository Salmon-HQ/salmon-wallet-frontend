/**
 * @salmon/ui - Shared web UI package
 *
 * Provides React DOM + MUI components and utilities shared across web apps.
 */

// Components
export * from './components';

// Layouts
export * from './layouts';

// Icons
export { IconDefaults, iconSize } from './icons';
export type { IconComponent, IconSizeToken } from './icons';

// Theme
export { salmonTheme } from './theme';

// Utilities
export { styled } from './utils/styled';
export { visuallyHidden } from './utils/visuallyHidden';
