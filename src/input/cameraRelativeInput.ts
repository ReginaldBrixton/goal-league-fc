import type { InputState, Vec } from '../engine/matchEngine';

export interface CameraControlBasis {
  screenRight: Vec;
  screenUp: Vec;
}

function normalize(vector: Vec): Vec {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < 0.0001) return { x: 0, y: 0 };
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function mapScreenInputToPitch(input: InputState, basis: CameraControlBasis): Vec {
  const horizontal = Number(input.right) - Number(input.left);
  const vertical = Number(input.up) - Number(input.down);
  if (horizontal === 0 && vertical === 0) return { x: 0, y: 0 };

  return normalize({
    x: basis.screenRight.x * horizontal + basis.screenUp.x * vertical,
    y: basis.screenRight.y * horizontal + basis.screenUp.y * vertical,
  });
}
