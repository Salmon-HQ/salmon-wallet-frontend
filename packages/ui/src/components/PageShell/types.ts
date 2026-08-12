import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import type { ScalesBackgroundProps } from '../ScalesBackground';

type ScrollContentProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'style'>;

export interface PageShellProps {
  title: ReactNode;
  onBack: () => void;
  children: ReactNode;
  backgroundColor?: 'primary' | 'secondary';
  fullHeight?: boolean;
  showScalesBackground?: boolean;
  scalesBackgroundProps?: ScalesBackgroundProps;
  headerRight?: ReactNode;
  scrollContentStyle?: CSSProperties;
  scrollContentProps?: ScrollContentProps;
  scrollContentRef?: (node: HTMLDivElement | null) => void;
  maxWidth?: number;
  className?: string;
  style?: CSSProperties;
}
