import assert from 'node:assert/strict';
import test from 'node:test';
import type { InputState } from '../src/engine/matchEngine';
import { mapScreenInputToPitch, type CameraControlBasis } from '../src/input/cameraRelativeInput';

const basis: CameraControlBasis = {
  screenRight: { x: 1, y: 0 },
  screenUp: { x: 0, y: 1 },
};

function input(partial: Partial<InputState>): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    pass: false,
    shoot: false,
    switchPlayer: false,
    slide: false,
    ...partial,
  };
}

test('screen directions map into the current camera pitch basis', () => {
  assert.deepEqual(mapScreenInputToPitch(input({ right: true }), basis), { x: 1, y: 0 });
  assert.deepEqual(mapScreenInputToPitch(input({ up: true }), basis), { x: 0, y: 1 });
  assert.deepEqual(mapScreenInputToPitch(input({ left: true }), basis), { x: -1, y: 0 });
  assert.deepEqual(mapScreenInputToPitch(input({ down: true }), basis), { x: 0, y: -1 });
});

test('diagonal screen movement is normalized instead of gaining speed', () => {
  const mapped = mapScreenInputToPitch(input({ up: true, right: true }), basis);
  assert.ok(Math.abs(Math.hypot(mapped.x, mapped.y) - 1) < 0.0001);
  assert.ok(mapped.x > 0);
  assert.ok(mapped.y > 0);
});

test('opposite directions cancel cleanly', () => {
  assert.deepEqual(mapScreenInputToPitch(input({ left: true, right: true }), basis), { x: 0, y: 0 });
});
