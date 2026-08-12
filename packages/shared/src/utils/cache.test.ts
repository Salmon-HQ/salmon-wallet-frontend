import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartCache } from './cache';

describe('SmartCache', () => {
  let cache: SmartCache<string>;

  beforeEach(() => {
    cache = new SmartCache<string>({ maxSize: 3, ttl: 1000 });
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should respect TTL and expire old values', () => {
    // SmartCache expiry is based on Date.now(); vi.useFakeTimers() fakes Date too.
    vi.useFakeTimers();
    try {
      cache = new SmartCache<string>({ maxSize: 3, ttl: 100 });
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(150);

      expect(cache.get('key1')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should evict oldest item when maxSize is exceeded', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    expect(cache.size).toBe(3);

    cache.set('key4', 'value4');
    expect(cache.size).toBe(3);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order when accessing items', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    cache.get('key1');

    cache.set('key4', 'value4');
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key1')).toBe('value1');
  });

  it('should handle has() correctly', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should delete items', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);

    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
  });

  it('should clear all items', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should update existing keys without evicting', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    cache.set('key1', 'updated');
    expect(cache.size).toBe(3);
    expect(cache.get('key1')).toBe('updated');
  });

  it('should handle null values', () => {
    const nullableCache = new SmartCache<string | null>({ maxSize: 10, ttl: 1000 });

    nullableCache.set('null-value', null);
    expect(nullableCache.get('null-value')).toBeNull();
    expect(nullableCache.has('null-value')).toBe(true);
  });

  it('should handle empty strings', () => {
    cache.set('empty', '');
    expect(cache.get('empty')).toBe('');
    expect(cache.has('empty')).toBe(true);
  });

  it('should handle concurrent updates', () => {
    const numCache = new SmartCache<number>({ maxSize: 3, ttl: 1000 });

    numCache.set('key1', 1);
    numCache.set('key2', 2);
    numCache.set('key1', 10);
    numCache.set('key3', 3);

    expect(numCache.get('key1')).toBe(10);
    expect(numCache.size).toBe(3);
  });
});
