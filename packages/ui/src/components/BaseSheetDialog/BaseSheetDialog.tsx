/**
 * BaseSheetDialog - Root component for compound sheet dialog
 *
 * This is the root component that wraps MUI Dialog with pre-configured styling
 * and provides context for sub-components (StandardHeader, HandleHeader, Content).
 *
 * @example
 * ```tsx
 * <BaseSheetDialog visible={visible} onClose={onClose} size="small">
 *   <BaseSheetDialog.StandardHeader title="Receive" />
 *   <BaseSheetDialog.Content padding="lg">
 *     {content}
 *   </BaseSheetDialog.Content>
 * </BaseSheetDialog>
 * ```
 */

import React, { createContext, useContext } from 'react';
import { Thermocline } from '../Thermocline';
import { SHEET_GROUND_STYLE, StyledDialog } from './styles';
import type { BaseSheetDialogProps } from './types';

// ============================================================================
// Context
// ============================================================================

interface BaseSheetDialogContextValue {
  onClose: () => void;
}

const BaseSheetDialogContext = createContext<BaseSheetDialogContextValue | null>(null);

/**
 * Hook to access BaseSheetDialog context (used by sub-components)
 */
export function useBaseSheetDialog(): BaseSheetDialogContextValue {
  const context = useContext(BaseSheetDialogContext);
  if (!context) {
    throw new Error('BaseSheetDialog sub-components must be used within BaseSheetDialog');
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * BaseSheetDialog - Root dialog wrapper component
 */
export function BaseSheetDialog({
  visible,
  onClose,
  children,
  background,
  size = 'medium',
  colorScheme = 'dialog',
  className,
  style,
  ariaLabelledBy,
}: BaseSheetDialogProps): React.ReactElement {
  const contextValue: BaseSheetDialogContextValue = { onClose };

  // A sheet is a membrane, and the thermocline is what a membrane is made of:
  // every sheet grounds on the thick tier unless its caller brings a ground of
  // its own, in which case that one wins and the default is not drawn — the
  // material never stacks. Its texture is the membrane field, one dark scales
  // layer the material mounts itself. See DESIGN.md §The thermocline is the
  // sheet material and §The membrane field.
  const resolvedBackground = background ?? <Thermocline tier="thick" style={SHEET_GROUND_STYLE} />;

  return (
    <BaseSheetDialogContext.Provider value={contextValue}>
      <StyledDialog
        open={visible}
        onClose={onClose}
        aria-labelledby={ariaLabelledBy}
        className={className}
        PaperProps={{ style }}
        $colorScheme={colorScheme}
        $size={size}
        disableEnforceFocus
      >
        {/* Ground first: the sub-components below are all positioned and sit
            on z-index 1, so the material stays behind everything the sheet
            holds. */}
        {resolvedBackground}

        {/* Content */}
        {children}
      </StyledDialog>
    </BaseSheetDialogContext.Provider>
  );
}
