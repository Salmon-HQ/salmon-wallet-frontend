/**
 * @vitest-environment jsdom
 *
 * The dialog hosts an irreversible action (NFT send). Backdrop clicks and
 * Escape must stop dismissing it once the transfer is in flight, while the
 * explicit controls keep working.
 *
 * It also owns the ground every dialog built on it inherits: a modal is the
 * DOM's sheet, so it is made of the material rather than of an opaque fill,
 * and the material carries exactly one scales layer — a second copy reads as
 * a band. See DESIGN.md §The thermocline is the sheet material and §The
 * membrane field.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `./styles` reaches @salmon/shared, which pulls react-native into the jsdom
// bundle. The dismissal rule under test lives entirely in BaseDialog, so the
// unstyled MUI Dialog is a faithful stand-in.
vi.mock('./styles', async () => {
  const Dialog = (await import('@mui/material/Dialog')).default;
  return { StyledDialog: Dialog, DIALOG_GROUND_STYLE: {} };
});

// The material reads its tokens straight from the barrel, which pulls react
// native into the jsdom bundle. Only the values it paints with are needed.
vi.mock('@salmon/shared', () => ({
  semantic: {
    surface: {
      raised: '#161C2D',
      crest: '#1B2233',
      membraneThin: 'rgba(11, 15, 25, 0.62)',
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
    scales: { membraneFieldStroke: 'rgba(7, 9, 17, 0.45)' },
  },
}));

// The seigaiha drawing is pinned by its own suite; here it only needs to be
// countable, because the rule under test is how many copies of it exist.
vi.mock('../ScalesBackground', () => ({
  ScalesBackground: () => <div data-testid="scales-background" />,
}));

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

describe('BaseDialog ground', () => {
  it('grounds on the material rather than on a fill', () => {
    renderDialog(true);
    expect(screen.getByTestId('thermocline')).toBeTruthy();
  });

  it('carries exactly one scales layer', () => {
    renderDialog(true);
    expect(screen.getAllByTestId('scales-background')).toHaveLength(1);
  });
});
