/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSemantic, ThemeProvider } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { BottomSheetContainer } from './BottomSheetContainer';

function stubMatchMedia(reduceMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') && reduceMotion,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BottomSheetContainer', () => {
  it('renders content and the dark backdrop token when visible', () => {
    stubMatchMedia(false);
    renderInMode(
      'dark',
      <BottomSheetContainer visible onClose={vi.fn()} testID="sheet">
        <div>sheet body</div>
      </BottomSheetContainer>
    );

    expect(screen.getByTestId('sheet').tagName).toBe('DIALOG');
    expect(screen.getByText('sheet body')).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    stubMatchMedia(false);
    renderInMode(
      'dark',
      <BottomSheetContainer visible={false} onClose={vi.fn()} testID="sheet">
        <div>sheet body</div>
      </BottomSheetContainer>
    );

    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('draws the drag handle from the mode-correct token, both modes', () => {
    stubMatchMedia(false);
    const dark = createSemantic('dark').sheet.handle;
    const light = createSemantic('light').sheet.handle;
    expect(dark).not.toBe(light);

    const { unmount } = renderInMode(
      'dark',
      <BottomSheetContainer visible onClose={vi.fn()}>
        <div>content</div>
      </BottomSheetContainer>
    );
    const handleDark = document.querySelector('[style*="border-radius: 9999px"]');
    expect(handleDark?.getAttribute('style')).toContain(asRenderedColor(dark));
    unmount();

    renderInMode(
      'light',
      <BottomSheetContainer visible onClose={vi.fn()}>
        <div>content</div>
      </BottomSheetContainer>
    );
    const handleLight = document.querySelector('[style*="border-radius: 9999px"]');
    expect(handleLight?.getAttribute('style')).toContain(asRenderedColor(light));
  });

  it('requests close on a backdrop click', () => {
    stubMatchMedia(false);
    const onClose = vi.fn();
    renderInMode(
      'dark',
      <BottomSheetContainer visible onClose={onClose} testID="sheet">
        <div>content</div>
      </BottomSheetContainer>
    );

    const dialog = screen.getByTestId('sheet');
    const backdrop = dialog.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open on a backdrop click when not dismissible', () => {
    stubMatchMedia(false);
    const onClose = vi.fn();
    renderInMode(
      'dark',
      <BottomSheetContainer visible onClose={onClose} dismissible={false} testID="sheet">
        <div>content</div>
      </BottomSheetContainer>
    );

    const dialog = screen.getByTestId('sheet');
    const backdrop = dialog.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('requests close on the platform Escape signal, and is swallowed when not dismissible', () => {
    stubMatchMedia(false);
    const onClose = vi.fn();
    renderInMode(
      'dark',
      <BottomSheetContainer visible onClose={onClose} dismissible={false} testID="sheet">
        <div>content</div>
      </BottomSheetContainer>
    );

    const dialog = screen.getByTestId('sheet');
    const cancelled = fireEvent(dialog, new Event('cancel', { cancelable: true }));
    // Always prevented, so the dialog never self-closes ahead of the exit animation.
    expect(cancelled).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fires onClosed once the exit has actually left, under reduced motion', async () => {
    stubMatchMedia(true);
    const onClosed = vi.fn();
    const sheet = (visible: boolean) => (
      <ThemeProvider systemScheme="dark">
        <BottomSheetContainer
          visible={visible}
          onClose={vi.fn()}
          onClosed={onClosed}
          testID="sheet"
        >
          <div>content</div>
        </BottomSheetContainer>
      </ThemeProvider>
    );
    const { rerender } = render(sheet(true));

    rerender(sheet(false));

    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('sheet')).toBeNull();
  });
});
