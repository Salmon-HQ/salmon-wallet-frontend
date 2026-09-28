# API Service Patterns

## File location

All services live in `packages/shared/src/api/services/`.

## API clients

Two pre-configured Axios instances exist in `packages/shared/src/api/client.ts`:

- `apiClient` — Main API (dynamic data: balances, prices, transactions)
- `staticApiClient` — CDN/static API (token lists, network configs, images)

Never create new Axios instances. Use these.

## Service structure

Every service follows this layout:

```typescript
/**
 * Service Name
 *
 * Brief description of what this service does.
 *
 * @module api/services/serviceName
 */

import { apiClient } from '../client';
import { SmartCache } from '../../utils/cache';
import type { MyType } from '../../types/myDomain';

// ============================================================================
// Cache
// ============================================================================

const myCache = new SmartCache<MyType>({ maxSize: 10, ttl: 5 * 60 * 1000 });

// ============================================================================
// Service Functions
// ============================================================================

export async function getMyData(id: string): Promise<MyType | null> {
  const cached = myCache.get(id);
  if (cached) return cached;

  try {
    const { data } = await apiClient.get<MyType>(`/v1/my-endpoint/${id}`);
    if (data) {
      myCache.set(id, data);
    }
    return data;
  } catch (error) {
    console.error('[MyService] Failed to fetch:', error);
    return null;
  }
}

export function clearMyCache(): void {
  myCache.clear();
}
```

## SmartCache usage

`SmartCache<T>` is an LRU cache with TTL (from `packages/shared/src/utils/cache.ts`):

```typescript
const cache = new SmartCache<T>({
  maxSize: 50,         // Max items (default: 50)
  ttl: 10 * 60 * 1000  // TTL in ms (default: 10 minutes)
});

cache.get(key)         // Returns T | undefined (expired = undefined)
cache.set(key, value)  // Stores with current timestamp
cache.has(key)         // Boolean check (respects TTL)
cache.delete(key)      // Remove specific key
cache.clear()          // Remove all
```

Common TTL values in the codebase:
- Exchange rates: 15 minutes
- Price data: 5 minutes
- Token lists: 10 minutes
- Network configs: app lifetime (use Promise-based cache instead)

## Promise-based cache (alternative)

For data that rarely changes (network configs), use a simpler Promise-based cache:

```typescript
let dataPromise: Promise<MyType[]> | null = null;

export async function getData(): Promise<MyType[]> {
  if (dataPromise) return dataPromise;

  dataPromise = apiClient
    .get<MyType[]>('/v1/endpoint')
    .then(({ data }) => data);

  try {
    return await dataPromise;
  } catch (error) {
    dataPromise = null;  // Clear on error to allow retry
    throw error;
  }
}
```

## Error handling patterns

Two approaches depending on context:

**Return null (graceful degradation):**
```typescript
try {
  const { data } = await apiClient.get<T>(url);
  return data;
} catch (error) {
  console.error('[ServiceName] Failed:', error);
  return null;
}
```

**Throw (caller handles):**
```typescript
try {
  return await dataPromise;
} catch (error) {
  dataPromise = null;
  throw error;
}
```

Use return-null when the UI can show a fallback. Use throw when the caller needs to decide.

## Fallback data

Some services provide fallback values for graceful degradation:

```typescript
const FALLBACK_RATES: ExchangeRates = {
  base: 'usd',
  timestamp: 0,
  rates: { usd: 1 } as ExchangeRates['rates'],
};
```

## DI adapter pattern

When services feed into blockchain account classes, export adapter functions:

```typescript
export const myApiFunctions = {
  fetchBalance: (address: string, networkId: string) =>
    getBalance(address, networkId),
  broadcastTransaction: (txn: string) =>
    broadcastTransaction(txn),
};
```

Account classes receive these via constructor injection:
```typescript
const account = new SolanaAccount(solanaApiFunctions);
```

## Rate limiting for blockchain APIs

For APIs with rate limits, use chunked requests:

```typescript
async function fetchInChunks<T>(
  items: string[],
  chunkSize: number,
  fetcher: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await fetcher(chunk);
    results.push(...chunkResults);
  }
  return results;
}
```

## Barrel exports

After creating a service, export it from:
1. `packages/shared/src/api/services/index.ts`
2. `packages/shared/src/api/index.ts` (if not already re-exporting services)

## Real examples

- Simple with SmartCache: `services/exchangeRates.ts`
- Promise-based cache: `services/network.ts`
- With DI adapters: `services/solana.ts`, `services/bitcoin.ts`
- With rate limiting: `services/balance.ts` (chunked price fetches)
- Complex multi-function: `services/tokens.ts` (multi-tier fallback)
