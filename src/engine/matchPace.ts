export const USER_ACCELERATION = 17.5;
export const PASS_SPEED_MULTIPLIER = 1.12;
export const SHOT_SPEED_MULTIPLIER = 1.08;
export const MATCH_ANIMATION_RATE = 1.12;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function playerTopSpeed(pace: number): number {
  return 6.35 + clamp(pace, 20, 99) / 99 * 4.1;
}
