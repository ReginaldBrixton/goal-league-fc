export interface AnalogStickVector {
  /** Horizontal gameplay input. Right is positive. */
  x: number;
  /** Vertical gameplay input. Up is positive. */
  y: number;
  /** Dead-zone-adjusted input strength in the range 0..1. */
  magnitude: number;
  /** Clamped horizontal thumb position in the range -1..1. */
  visualX: number;
  /** Clamped vertical thumb position in screen coordinates; down is positive. */
  visualY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cleanZero(value: number): number {
  return Math.abs(value) < 0.0000001 ? 0 : value;
}

/**
 * Converts a pointer displacement into a radial analogue-stick value.
 *
 * `deltaY` follows screen coordinates (positive is down), while the returned
 * gameplay `y` follows controller coordinates (positive is up).
 */
export function resolveAnalogStick(
  deltaX: number,
  deltaY: number,
  radius: number,
  deadZone = 0.14,
): AnalogStickVector {
  const safeRadius = Math.max(1, Math.abs(radius));
  const rawX = Number.isFinite(deltaX) ? deltaX / safeRadius : 0;
  const rawY = Number.isFinite(deltaY) ? deltaY / safeRadius : 0;
  const rawMagnitude = Math.hypot(rawX, rawY);

  if (rawMagnitude < 0.0001) {
    return { x: 0, y: 0, magnitude: 0, visualX: 0, visualY: 0 };
  }

  const clampedMagnitude = Math.min(1, rawMagnitude);
  const unitX = rawX / rawMagnitude;
  const unitY = rawY / rawMagnitude;
  const safeDeadZone = clamp(deadZone, 0, 0.75);
  const adjustedMagnitude = rawMagnitude <= safeDeadZone
    ? 0
    : clamp((clampedMagnitude - safeDeadZone) / (1 - safeDeadZone), 0, 1);

  return {
    x: cleanZero(unitX * adjustedMagnitude),
    y: cleanZero(-unitY * adjustedMagnitude),
    magnitude: adjustedMagnitude,
    visualX: cleanZero(unitX * clampedMagnitude),
    visualY: cleanZero(unitY * clampedMagnitude),
  };
}
