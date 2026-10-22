/**
 * HTTP transport tests: what the request that leaves the device looks like.
 * `keepalive` lets it outlive a closing extension window; `text/plain` with no
 * other header keeps a cross-origin call free of a CORS preflight.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHttpTransport } from './transport';
import type { AnalyticsBatch } from './types';

const BATCH: AnalyticsBatch = {
  context: { installId: 'install-1', sessionId: 'session-1', platform: 'ios', appVersion: '1.5.0' },
  events: [{ event: 'app_opened', props: {}, ts: 1760900000000 }],
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('EXPO_PUBLIC_ANALYTICS_URL', '');
  vi.stubEnv('EXPO_PUBLIC_API_URL', '');
  vi.stubEnv('VITE_ANALYTICS_URL', '');
  vi.stubEnv('VITE_API_URL', 'https://api.example');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('createHttpTransport', () => {
  it('posts the batch as plain text with keepalive and no other header', async () => {
    await createHttpTransport().send(BATCH);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example/v1/events', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(BATCH),
      signal: expect.any(AbortSignal),
    });
  });

  it('posts to the dedicated analytics URL when one is set', async () => {
    vi.stubEnv('VITE_ANALYTICS_URL', 'https://ingest.example');

    await createHttpTransport().send(BATCH);

    expect(fetchMock.mock.calls[0][0]).toBe('https://ingest.example/v1/events');
  });

  it.each([400, 500])('throws on a %i answer so the client re-queues', async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));

    await expect(createHttpTransport().send(BATCH)).rejects.toThrow();
  });

  it('aborts the request after 10 seconds', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );

    const sending = createHttpTransport().send(BATCH);
    const failure = expect(sending).rejects.toThrow();
    const signal = fetchMock.mock.calls[0][1]?.signal;

    vi.advanceTimersByTime(9_999);
    expect(signal?.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal?.aborted).toBe(true);
    await failure;
  });
});
