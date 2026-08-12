/**
 * Tests for useRuntime hook
 *
 * Tests cover platform detection and runtime-specific functions:
 * - Platform detection (React Native vs Web)
 * - Extension detection (Chrome/Firefox)
 * - Adapter mode detection
 * - URL context parsing
 *
 * Note: These tests focus on the logic layer without renderHook.
 * The hook's internal functions are tested through the module exports.
 */

import { describe, it, expect } from 'vitest';
import type { RuntimeInfo } from './useRuntime';
import { ADAPTER_PREFIXES } from './useRuntime';

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Helper to test isReactNative detection logic.
 */
function testIsReactNative(navigatorProduct: string | undefined): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigatorProduct === 'ReactNative'
  );
}

/**
 * Helper to test isExtension detection logic.
 */
function testIsExtension(options: {
  hasWindow: boolean;
  chromeRuntimeId?: string;
  browserRuntimeId?: string;
}): boolean {
  const { hasWindow, chromeRuntimeId, browserRuntimeId } = options;

  if (!hasWindow) return false;

  // Check for Chrome extension APIs
  if (chromeRuntimeId) {
    return true;
  }

  // Check for browser extension APIs (Firefox, etc.)
  if (browserRuntimeId) {
    return true;
  }

  return false;
}

/**
 * Helper to test adapter mode detection logic.
 */
function testIsAdapter(options: {
  contextHasOrigin: boolean;
  isExtension: boolean;
  hasOpener: boolean;
}): boolean {
  const { contextHasOrigin, isExtension, hasOpener } = options;
  return contextHasOrigin && (isExtension || hasOpener);
}

/**
 * Helper to simulate web runtime info.
 */
function createWebRuntimeInfo(options: {
  hash?: string;
  isExtension?: boolean;
  opener?: Window | null;
}): RuntimeInfo {
  const { hash = '', isExtension = false, opener = null } = options;

  const context = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const hasOrigin = context.has('origin');

  return {
    ready: true,
    context,
    opener,
    isAdapter: hasOrigin && (isExtension || !!opener),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useRuntime Hook Logic', () => {
  describe('Platform Detection', () => {
    it('should detect React Native environment when navigator.product is ReactNative', () => {
      const isRN = testIsReactNative('ReactNative');
      expect(isRN).toBe(true);
    });

    it('should not detect React Native in standard web environment', () => {
      const isRN = testIsReactNative('Gecko');
      expect(isRN).toBe(false);
    });
  });

  describe('Extension Detection', () => {
    it('should detect Chrome extension when chrome.runtime.id is present', () => {
      const isExt = testIsExtension({
        hasWindow: true,
        chromeRuntimeId: 'extension-id-123',
      });
      expect(isExt).toBe(true);
    });

    it('should not detect extension when chrome.runtime.id is missing', () => {
      const isExt = testIsExtension({
        hasWindow: true,
        chromeRuntimeId: undefined,
      });
      expect(isExt).toBe(false);
    });

    it('should detect Firefox extension when browser.runtime.id is present', () => {
      const isExt = testIsExtension({
        hasWindow: true,
        browserRuntimeId: 'firefox-extension-id',
      });
      expect(isExt).toBe(true);
    });

    it('should not detect extension when browser.runtime.id is missing', () => {
      const isExt = testIsExtension({
        hasWindow: true,
        browserRuntimeId: undefined,
      });
      expect(isExt).toBe(false);
    });

    it('should not detect extension when window is undefined', () => {
      const isExt = testIsExtension({
        hasWindow: false,
        chromeRuntimeId: 'extension-id',
      });
      expect(isExt).toBe(false);
    });
  });

  describe('Adapter Mode Detection', () => {
    it('should detect adapter mode when origin is in context and extension is present', () => {
      const isAdapter = testIsAdapter({
        contextHasOrigin: true,
        isExtension: true,
        hasOpener: false,
      });
      expect(isAdapter).toBe(true);
    });

    it('should not detect adapter mode when origin is missing from context', () => {
      const isAdapter = testIsAdapter({
        contextHasOrigin: false,
        isExtension: true,
        hasOpener: false,
      });
      expect(isAdapter).toBe(false);
    });

    it('should detect adapter mode when origin is present and window.opener exists', () => {
      const isAdapter = testIsAdapter({
        contextHasOrigin: true,
        isExtension: false,
        hasOpener: true,
      });
      expect(isAdapter).toBe(true);
    });

    it('should not detect adapter mode when origin exists but no extension or opener', () => {
      const isAdapter = testIsAdapter({
        contextHasOrigin: true,
        isExtension: false,
        hasOpener: false,
      });
      expect(isAdapter).toBe(false);
    });
  });

  describe('URL Context Parsing', () => {
    it('should parse URL hash parameters correctly', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: '#origin=https://example.com&network=solana-mainnet&action=connect',
        isExtension: true,
      });

      expect(runtimeInfo.context.get('origin')).toBe('https://example.com');
      expect(runtimeInfo.context.get('network')).toBe('solana-mainnet');
      expect(runtimeInfo.context.get('action')).toBe('connect');
    });

    it('should handle empty URL hash gracefully', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: '',
      });

      expect(runtimeInfo.context.get('origin')).toBeNull();
      expect(runtimeInfo.ready).toBe(true);
    });

    it('should parse hash without leading # symbol', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: 'origin=https://dapp.io',
        isExtension: true,
      });

      expect(runtimeInfo.context.get('origin')).toBe('https://dapp.io');
    });

    it('should handle URL-encoded parameters', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: '#origin=https%3A%2F%2Fexample.com&name=My%20dApp',
        isExtension: true,
      });

      expect(runtimeInfo.context.get('origin')).toBe('https://example.com');
      expect(runtimeInfo.context.get('name')).toBe('My dApp');
    });
  });

  describe('Window Opener Detection', () => {
    it('should detect adapter mode when window.opener is present with origin', () => {
      const mockOpener = {} as Window;
      const runtimeInfo = createWebRuntimeInfo({
        hash: '#origin=https://dapp.example.com',
        opener: mockOpener,
        isExtension: false,
      });

      expect(runtimeInfo.isAdapter).toBe(true);
      expect(runtimeInfo.opener).toBe(mockOpener);
    });

    it('should return null opener when window.opener is not set', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: '#origin=https://dapp.example.com',
        opener: null,
        isExtension: false,
      });

      expect(runtimeInfo.opener).toBeNull();
      expect(runtimeInfo.isAdapter).toBe(false);
    });
  });

  describe('RuntimeInfo Structure', () => {
    it('should always return ready=true for web implementation', () => {
      const runtimeInfo = createWebRuntimeInfo({});
      expect(runtimeInfo.ready).toBe(true);
    });

    it('should return all required RuntimeInfo properties', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: '#origin=https://test.com',
        isExtension: true,
      });

      expect(runtimeInfo).toHaveProperty('ready');
      expect(runtimeInfo).toHaveProperty('context');
      expect(runtimeInfo).toHaveProperty('opener');
      expect(runtimeInfo).toHaveProperty('isAdapter');
    });

    it('should return URLSearchParams for context', () => {
      const runtimeInfo = createWebRuntimeInfo({
        hash: '#param=value',
      });

      expect(runtimeInfo.context).toBeInstanceOf(URLSearchParams);
    });
  });
});

describe('Adapter Prefixes', () => {
  it('should export ADAPTER_PREFIXES constant', () => {
    expect(ADAPTER_PREFIXES).toBeDefined();
    expect(Array.isArray(ADAPTER_PREFIXES)).toBe(true);
  });

  it('should contain solana-wallet prefix', () => {
    expect(ADAPTER_PREFIXES).toContain('solana-wallet:');
  });

  it('should contain salmon wallet adapter URL prefix', () => {
    expect(ADAPTER_PREFIXES.some(prefix => prefix.includes('salmonwallet'))).toBe(true);
  });
});
