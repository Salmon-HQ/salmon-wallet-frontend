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
import { StyledDialog } from './styles';
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
  size = 'medium',
  colorScheme = 'dialog',
  className,
  style,
  ariaLabelledBy,
}: BaseSheetDialogProps): React.ReactElement {
  const contextValue: BaseSheetDialogContextValue = { onClose };

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
        {/* No decorative field. A sheet is a membrane — the one translucent
            plane in the system — and the motif never goes where a live
            backdrop shows through, because that is the one place it cannot be
            kept off the content behind it. What a membrane is entitled to is
            the 24px refraction strip along its own top edge, which is a
            different appearance at a different scale and is not built yet. */}

        {/* Content */}
        {children}
      </StyledDialog>
    </BaseSheetDialogContext.Provider>
  );
}
