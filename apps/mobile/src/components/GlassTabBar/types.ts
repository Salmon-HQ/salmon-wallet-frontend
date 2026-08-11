/**
 * GlassTabBar Component Types
 *
 * Type definitions for the glass-effect bottom tab bar
 * with Liquid Glass support on iOS 26+.
 *
 * @module components/GlassTabBar
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';

/**
 * Configuration for a single tab item.
 */
export interface TabConfig {
  name: string;
  icon: React.FC<{ size?: number; color?: string }>;
  label: string;
  labelKey: string;
  iconSize: number;
}

/**
 * Props for the GlassTabBar component.
 * Extends React Navigation's BottomTabBarProps.
 */
export type GlassTabBarProps = BottomTabBarProps;
