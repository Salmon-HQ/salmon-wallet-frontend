import { describe, expect, it } from 'vitest';
import { startTestAnalytics } from '@salmon/shared/test-utils/analytics';
import { trackDAppApproval } from './useDAppApproval';

describe('trackDAppApproval', () => {
  it('never throws into the approval, even when tracking fails', async () => {
    // The test client runs strict, so an event outside the catalog throws.
    await startTestAnalytics();
    expect(() => trackDAppApproval('not_an_event' as never)).not.toThrow();
  });
});
