import { describe, expect, it } from 'vitest';
import { iconBubbleLook } from './iconBubble';
import { semantic } from './semantic';
import { borderRadius } from './spacing';

const base = { tone: 'accent', shape: 'circle', radius: 'xl', size: 40, disabled: false } as const;

describe('iconBubbleLook', () => {
  it('takes ground and ink from the tone, and the glyph from the bubble size', () => {
    expect(iconBubbleLook(semantic, base)).toEqual({
      background: semantic.accent.fill,
      ink: semantic.accent.onFill,
      border: undefined,
      cornerRadius: borderRadius.full,
      glyph: 18,
    });
  });

  it('lets the call site pick the ink and the glyph size of an enabled bubble', () => {
    const look = iconBubbleLook(semantic, { ...base, iconColor: '#123456', iconSize: 12 });

    expect(look.ink).toBe('#123456');
    expect(look.glyph).toBe(12);
  });

  it('draws a disabled control as its own object: no border, no call-site ink', () => {
    const look = iconBubbleLook(semantic, {
      ...base,
      tone: 'outline',
      iconColor: '#123456',
      disabled: true,
    });

    expect(look).toMatchObject({
      background: semantic.surface.crest,
      ink: semantic.text.disabled,
      border: undefined,
    });
  });

  it('borders only the outline tone, and rounds a rounded bubble to a card corner', () => {
    const look = iconBubbleLook(semantic, {
      ...base,
      tone: 'outline',
      shape: 'rounded',
      radius: 'lg',
    });

    expect(look.border).toBe(semantic.border.raised);
    expect(look.cornerRadius).toBe(borderRadius.r3);
    expect(iconBubbleLook(semantic, { ...base, shape: 'rounded' }).cornerRadius).toBe(
      borderRadius.r4
    );
  });
});
