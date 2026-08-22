/**
 * BaseDialog - Root component for compound dialog
 *
 * This is the root component that wraps MUI Dialog with pre-configured styling
 * and provides context for sub-components (Header, Content, Actions, etc).
 *
 * @example
 * ```tsx
 * <BaseDialog visible={visible} onClose={onClose}>
 *   <BaseDialog.Header title="Confirm Action" showWarning />
 *   <BaseDialog.Content>
 *     <p>Are you sure?</p>
 *   </BaseDialog.Content>
 *   <BaseDialog.Actions>
 *     <BaseDialog.CancelButton onClick={onClose}>Cancel</BaseDialog.CancelButton>
 *     <BaseDialog.ActionButton onClick={handleConfirm}>Confirm</BaseDialog.ActionButton>
 *   </BaseDialog.Actions>
 * </BaseDialog>
 * ```
 */

import React, { createContext, useContext } from 'react';
import { Thermocline } from '../Thermocline';
import { DIALOG_GROUND_STYLE, StyledDialog } from './styles';
import type { BaseDialogProps } from './types';

// ============================================================================
// Context
// ============================================================================

interface BaseDialogContextValue {
  onClose: () => void;
  dismissible: boolean;
}

const BaseDialogContext = createContext<BaseDialogContextValue | null>(null);

/**
 * Hook to access BaseDialog context (used by sub-components)
 */
export function useBaseDialog(): BaseDialogContextValue {
  const context = useContext(BaseDialogContext);
  if (!context) {
    throw new Error('BaseDialog sub-components must be used within BaseDialog');
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * BaseDialog - Root dialog wrapper component
 */
export function BaseDialog({
  visible,
  onClose,
  dismissible = true,
  children,
  ariaLabelledBy,
}: BaseDialogProps): React.ReactElement {
  const contextValue: BaseDialogContextValue = { onClose, dismissible };

  // MUI fires onClose for backdrop clicks and Escape as well as explicit
  // controls. While an irreversible action is in flight those two paths must
  // not unmount the dialog — the user would lose the only report of it.
  const handleClose = (_event: object, reason: string): void => {
    if (!dismissible && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    onClose();
  };

  return (
    <BaseDialogContext.Provider value={contextValue}>
      <StyledDialog
        open={visible}
        onClose={handleClose}
        aria-labelledby={ariaLabelledBy}
        disableEnforceFocus
      >
        {/* A modal is the DOM's sheet, and the thermocline is what a sheet is
            made of: the dialog grounds on the thick tier instead of an opaque
            fill. Its texture is the membrane field, one dark scales layer the
            material mounts itself, so nothing stacks a second one on top. See
            DESIGN.md §The thermocline is the sheet material and §The membrane
            field. Ground first: the sections above it are positioned, so the
            material stays behind everything the dialog holds. */}
        <Thermocline tier="thick" style={DIALOG_GROUND_STYLE} />

        {children}
      </StyledDialog>
    </BaseDialogContext.Provider>
  );
}
