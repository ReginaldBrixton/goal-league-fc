import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAnalogStick } from '../src/input/analogJoystickMath';
import { mapScreenInputToPitch } from '../src/input/cameraRelativeInput';
import { integrateControlledVelocity, resolveControlledMovement } from '../src/engine/playerMovement';
import type { InputState } from '../src/engine/matchEngine';

const emptyInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  pass: false,
  shoot: false,
  switchPlayer: false,
  slide: false,
  moveX: 0,
  moveY: 0,
});

test('analogue stick applies a radial dead zone and preserves direction', () => {
  const centre = resolveAnalogStick(2, -3, 60, 0.14);
  assert.equal(centre.x, 0);
  assert.equal(centre.y, 0);
  assert.equal(centre.magnitude, 0);

  const diagonal = resolveAnalogStick(30, -30, 60, 0.14);
  assert.ok(diagonal.x > 0);
  assert.ok(diagonal.y > 0);
  assert.ok(Math.abs(diagonal.x - diagonal.y) < 0.0001);
  assert.ok(diagonal.magnitude > 0.45 && diagonal.magnitude < 0.7);
});

test('analogue stick clamps the thumb while producing full-strength output', () => {
  const result = resolveAnalogStick(180, 0, 60, 0.14);
  assert.equal(result.magnitude, 1);
  assert.equal(result.x, 1);
  assert.equal(result.y, 0);
  assert.equal(result.visualX, 1);
  assert.equal(result.visualY, 0);
});

test('camera-relative mapping preserves analogue magnitude', () => {
  const input = emptyInput();
  input.moveX = 0.5;
  input.moveY = 0;

  const mapped = mapScreenInputToPitch(input, {
    screenRight: { x: 0, y: 1 },
    screenUp: { x: -1, y: 0 },
  });

  assert.ok(Math.abs(mapped.x) < 0.0001);
  assert.ok(Math.abs(mapped.y - 0.5) < 0.0001);
});

test('controlled movement scales speed continuously with stick distance', () => {
  const half = resolveControlledMovement({ x: 0.5, y: 0 }, 9, false);
  const full = resolveControlledMovement({ x: 1, y: 0 }, 9, false);

  assert.ok(half.strength > 0.49 && half.strength < 0.51);
  assert.ok(half.targetSpeed > 0);
  assert.ok(half.targetSpeed < full.targetSpeed * 0.65);
  assert.ok(full.targetSpeed <= 9.55);
});

test('controlled velocity accelerates and brakes smoothly without overshoot', () => {
  const target = { x: 8, y: 0 };
  const accelerated = integrateControlledVelocity({ x: 0, y: 0 }, target, 1 / 60, false);
  assert.ok(accelerated.x > 0 && accelerated.x < target.x);

  const next = integrateControlledVelocity(accelerated, target, 1 / 60, false);
  assert.ok(next.x > accelerated.x && next.x < target.x);

  const braking = integrateControlledVelocity({ x: 8, y: 0 }, { x: 0, y: 0 }, 1 / 60, false);
  assert.ok(braking.x > 0 && braking.x < 8);
  assert.equal(braking.y, 0);
});
