import { describe, expect, it } from 'vitest';
import { overflowEdges } from './overflowEdges';

describe('overflowEdges', () => {
  it('fades only toward hidden content', () => {
    const row = { contentWidth: 300, containerWidth: 100 };
    expect(overflowEdges({ ...row, offset: 0 })).toEqual({ leading: false, trailing: true });
    expect(overflowEdges({ ...row, offset: 120 })).toEqual({ leading: true, trailing: true });
    expect(overflowEdges({ ...row, offset: 200 })).toEqual({ leading: true, trailing: false });
    expect(overflowEdges({ ...row, offset: 199.5 })).toEqual({ leading: true, trailing: false });
  });

  it('fades nothing when the row fits or is unmeasured', () => {
    expect(overflowEdges({ offset: 0, contentWidth: 90, containerWidth: 100 })).toEqual({
      leading: false,
      trailing: false,
    });
    expect(overflowEdges({ offset: 0, contentWidth: 300, containerWidth: 0 })).toEqual({
      leading: false,
      trailing: false,
    });
  });
});
