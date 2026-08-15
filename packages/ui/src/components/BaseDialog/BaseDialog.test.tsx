/**
 * @vitest-environment jsdom
 *
 * The dialog hosts an irreversible action (NFT send). Backdrop clicks and
 * Escape must stop dismissing it once the transfer is in flight, while the
 * explicit controls keep working.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `./styles` reaches @salmon/shared, which pulls react-native into the jsdom
// bundle. The dismissal rule under test lives entirely in BaseDialog, so the
// unstyled MUI Dialog is a faithful stand-in.
vi.mock('./styles', async () => {
  const Dialog = (await import('@mui/material/Dialog')).default;
  return { StyledDialog: Dialog };
});

const { BaseDialog } = await import('./BaseDialog');

afterEach(cleanup);

function renderDialog(dismissible: boolean) {
  const onClose = vi.fn();
  render(
    <BaseDialog visible onClose={onClose} dismissible={dismissible}>
      <div>body</div>
    </BaseDialog>
  );
  return onClose;
}

describe('BaseDialog dismissal', () => {
  it('closes on Escape when dismissible', () => {
    const onClose = renderDialog(true);
    fireEvent.keyDown(screen.getByText('body'), { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores Escape while an irreversible action is in flight', () => {
    const onClose = renderDialog(false);
    fireEvent.keyDown(screen.getByText('body'), { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a backdrop click while an irreversible action is in flight', () => {
    const onClose = renderDialog(false);
    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).not.toHaveBeenCalled();
  });
});
