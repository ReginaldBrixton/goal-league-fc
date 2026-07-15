import type { InputState } from '../engine/matchEngine';
import '../engine/matchEngine';

declare module '../engine/matchEngine' {
  interface InputState {
    /** Horizontal analogue movement in screen space. Right is positive. */
    moveX?: number;
    /** Vertical analogue movement in screen space. Up is positive. */
    moveY?: number;
  }
}

export type AnalogInputState = InputState & {
  moveX: number;
  moveY: number;
};
