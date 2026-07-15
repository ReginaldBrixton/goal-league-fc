import './analogInputTypes';
import type { InputState, Vec } from '../engine/matchEngine';

export interface CameraControlBasis {
  screenRight: Vec;
  screenUp: Vec;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(vector: Vec): Vec {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < 0.0001) return { x: 0, y: 0 };
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function mapScreenInputToPitch(input: InputState, basis: CameraControlBasis): Vec {
  const analogueX = Number.isFinite(input.moveX) ? input.moveX ?? 0 : 0;
  const analogueY = Number.isFinite(input.moveY) ? input.moveY ?? 0 : 0;
  const digitalX = Number(input.right) - Number(input.left);
  const digitalY = Number(input.up) - Number(input.down);
  const horizontal = clamp(analogueX + digitalX, -1, 1);
  const vertical = clamp(analogueY + digitalY, -1, 1);
  const inputMagnitude = Math.min(1, Math.hypot(horizontal, vertical));

  if (inputMagnitude < 0.0001) return { x: 0, y: 0 };

  const direction = normalize({
    x: basis.screenRight.x * horizontal + basis.screenUp.x * vertical,
    y: basis.screenRight.y * horizontal + basis.screenUp.y * vertical,
  });

  return {
    x: direction.x * inputMagnitude,
    y: direction.y * inputMagnitude,
  };
}
