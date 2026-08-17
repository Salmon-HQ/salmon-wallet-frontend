import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';

type ScrollContentProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'style'>;

export interface PageShellProps {
  title: ReactNode;
  onBack: () => void;
  /**
   * Disables the header back arrow. Set while an irreversible step is in
   * flight so a stray click cannot unmount the screen reporting its outcome.
   */
  backDisabled?: boolean;
  children: ReactNode;
  backgroundColor?: 'primary' | 'secondary';
  fullHeight?: boolean;
  headerRight?: ReactNode;
  scrollContentStyle?: CSSProperties;
  scrollContentProps?: ScrollContentProps;
  scrollContentRef?: (node: HTMLDivElement | null) => void;
  maxWidth?: number;
  className?: string;
  style?: CSSProperties;
}
