import type { CSSProperties, ReactNode } from 'react';

export interface SinkFloatProps {
  /**
   * Identity of the content being shown. When it changes, the content on
   * screen sinks, the beat passes, and the new content floats in.
   */
  transitionKey: string;
  children: ReactNode;
  /**
   * Travel distance in px. Defaults to `SINK_FLOAT_TRAVEL`; chrome speaks the
   * same verb at half of it.
   */
  distance?: number;
  /** The float's length. Defaults to `FLOAT_IN_MS`. */
  floatMs?: number;
  /** The sink's length. Defaults to `SINK_OUT_MS`. */
  sinkMs?: number;
  /**
   * How long the outgoing content is held before the swap: the sink plus the
   * beat that lets the eye read the double gesture. Defaults to
   * `FLOAT_DELAY_MS`. Override it together with `sinkMs`, or the beat stops
   * being a beat.
   */
  holdMs?: number;
  className?: string;
  style?: CSSProperties;
}
