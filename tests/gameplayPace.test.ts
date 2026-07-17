import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MATCH_ANIMATION_RATE,
  PASS_SPEED_MULTIPLIER,
  SHOT_SPEED_MULTIPLIER,
  USER_ACCELERATION,
  playerTopSpeed,
} from '../src/engine/matchPace';

test('the revised movement curve is faster without becoming arcade-like', () => {
  assert.ok(playerTopSpeed(20) >= 7.0);
  assert.ok(playerTopSpeed(74) >= 9.1);
  assert.ok(playerTopSpeed(99) <= 10.8);
  assert.ok(playerTopSpeed(99) > playerTopSpeed(74));
  assert.ok(playerTopSpeed(74) > playerTopSpeed(20));
});

test('ball actions and animation receive moderate pace increases', () => {
  assert.ok(PASS_SPEED_MULTIPLIER >= 1.08 && PASS_SPEED_MULTIPLIER <= 1.2);
  assert.ok(SHOT_SPEED_MULTIPLIER >= 1.04 && SHOT_SPEED_MULTIPLIER <= 1.15);
  assert.ok(MATCH_ANIMATION_RATE >= 1.08 && MATCH_ANIMATION_RATE <= 1.2);
  assert.ok(USER_ACCELERATION >= 16 && USER_ACCELERATION <= 20);
});