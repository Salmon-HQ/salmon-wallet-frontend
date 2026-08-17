/**
 * @vitest-environment jsdom
 *
 * The default path out of a destructive dialog must be the one that destroys
 * nothing. These assertions are about order and focus, not colour — the colour
 * half of the rule is asserted on the tokens themselves, in
 * `packages/shared/src/theme/contrast.test.ts`.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `../BaseDialog/styles` reaches @salmon/shared, which pulls react-native into
// the jsdom bundle. Everything under test here is structure and focus, so the
// unstyled MUI primitives are a faithful stand-in.
vi.mock('../BaseDialog/styles', async () => {
  const [Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, TextField, Typography] =
    await Promise.all([
      import('@mui/material/Dialog').then((m) => m.default),
      import('@mui/material/DialogTitle').then((m) => m.default),
      import('@mui/material/DialogContent').then((m) => m.default),
      import('@mui/material/DialogActions').then((m) => m.default),
      import('@mui/material/Button').then((m) => m.default),
      import('@mui/material/IconButton').then((m) => m.default),
      import('@mui/material/TextField').then((m) => m.default),
      import('@mui/material/Typography').then((m) => m.default),
    ]);
  const passthrough = (Component: React.ElementType, name: string) => {
    const Passthrough = ({
      $isDanger: _d,
      $prominent: _p,
      $stacked: _s,
      ...rest
    }: Record<string, unknown>) => <Component {...rest} />;
    Passthrough.displayName = name;
    return Passthrough;
  };
  return {
    StyledDialog: Dialog,
    StyledDialogTitle: DialogTitle,
    TitleContainer: 'div',
    TitleText: Typography,
    WarningIcon: () => <span data-testid="warning-glyph" />,
    CloseButton: IconButton,
    StyledDialogContent: DialogContent,
    MessageText: Typography,
    StyledTextField: TextField,
    StyledDialogActions: passthrough(DialogActions, 'StyledDialogActions'),
    StyledCancelButton: passthrough(Button, 'StyledCancelButton'),
    StyledActionButton: passthrough(Button, 'StyledActionButton'),
  };
});

// The barrel reaches react-native, which jsdom cannot parse. Only `spacing` is
// read outside the mocked styles module.
vi.mock('@salmon/shared', () => ({
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
}));

vi.mock('../../icons', () => ({
  XIcon: () => <span data-testid="close-glyph" />,
  WarningIcon: () => <span data-testid="warning-glyph" />,
  iconSize: { sm: 16, md: 20, lg: 24, xl: 28 },
}));

const { ConfirmDialog } = await import('./ConfirmDialog');

afterEach(cleanup);

function renderConfirm(isDanger: boolean) {
  render(
    <ConfirmDialog
      visible
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      isDanger={isDanger}
      title="Reset Wallet"
      message="This erases every wallet on this device."
      cancelText="Cancel"
      confirmText="Delete All Data"
      confirmTestID="confirm"
    />
  );
  return {
    cancel: screen.getByRole('button', { name: 'Cancel' }),
    confirm: screen.getByTestId('confirm'),
  };
}

describe('ConfirmDialog: the safe path is the default one', () => {
  it('focuses Cancel on a danger dialog, so Enter closes rather than destroys', () => {
    const { cancel } = renderConfirm(true);
    expect(document.activeElement).toBe(cancel);
  });

  it('puts Cancel ahead of the destructive action in reading and tab order', () => {
    const { cancel, confirm } = renderConfirm(true);
    // Node.DOCUMENT_POSITION_FOLLOWING — confirm comes after cancel.
    expect(cancel.compareDocumentPosition(confirm) & 4).toBeTruthy();
  });

  it('does not steal focus on an ordinary confirmation', () => {
    const { cancel } = renderConfirm(false);
    expect(document.activeElement).not.toBe(cancel);
  });

  it('drops the corner close control on a danger dialog, leaving one way out', () => {
    renderConfirm(true);
    expect(screen.queryByTestId('close-glyph')).toBeNull();
    cleanup();
    renderConfirm(false);
    expect(screen.getByTestId('close-glyph')).toBeTruthy();
  });

  it('states the danger with a glyph as well as with colour', () => {
    renderConfirm(true);
    expect(screen.getAllByTestId('warning-glyph').length).toBeGreaterThan(0);
  });
});
