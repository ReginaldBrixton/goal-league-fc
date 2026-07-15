import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPitchGuide, dampAngle } from '../src/three/matchGuides';

function close(actual: number, expected: number, tolerance = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('pass-guide geometry connects the carrier to the selected receiver', () => {
  const guide = buildPitchGuide({ x: 52.5, y: 34 }, { x: 73.5, y: 47.6 });

  close(guide.start.x, 0);
  close(guide.start.z, 0);
  close(guide.end.x, 1.2);
  close(guide.end.z, 2);
  close(guide.midpoint.x, 0.6);
  close(guide.midpoint.z, 1);
  close(guide.length, Math.hypot(1.2, 2));
  assert.ok(Number.isFinite(guide.rotationY));
});

test('guide geometry rejects a zero-length line without producing invalid transforms', () => {
  const guide = buildPitchGuide({ x: 40, y: 22 }, { x: 40, y: 22 });
  assert.equal(guide.visible, false);
  assert.equal(guide.length, 0);
  assert.equal(guide.rotationY, 0);
});

test('display angles take the shortest path and never snap through a full turn', () => {
  const current = Math.PI - 0.08;
  const target = -Math.PI + 0.08;
  const next = dampAngle(current, target, 8, 1 / 60);
  const travelled = Math.abs(Math.atan2(Math.sin(next - current), Math.cos(next - current)));

  assert.ok(travelled > 0);
  assert.ok(travelled < 0.08, `display rotation moved ${travelled.toFixed(3)} radians in one frame`);
});
