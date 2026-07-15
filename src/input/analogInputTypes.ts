import type { InputState } from '../engine/matchEngine';

export type AnalogInputState = InputState & {
  /** Horizontal analogue movement in screen space. Right is positive. */
  moveX: number;
  /** Vertical analogue movement in screen space. Up is positive. */
  moveY: number;
};
