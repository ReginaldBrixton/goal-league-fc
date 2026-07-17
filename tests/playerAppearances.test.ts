import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLAYER_APPEARANCE_COUNT,
  getPlayerAppearance,
  playerAppearances,
} from '../src/data/playerAppearances';

function signature(playerId: string): string {
  return JSON.stringify(getPlayerAppearance(playerId));
}

test('every generated footballer has an independently registered appearance file', () => {
  assert.equal(PLAYER_APPEARANCE_COUNT, 232);
  assert.equal(Object.keys(playerAppearances).length, PLAYER_APPEARANCE_COUNT);

  for (let index = 1; index <= PLAYER_APPEARANCE_COUNT; index += 1) {
    assert.ok(playerAppearances[`p${index}`], `missing appearance profile for p${index}`);
  }
});

test('registered player appearance signatures are unique', () => {
  const signatures = new Set<string>();
  for (let index = 1; index <= PLAYER_APPEARANCE_COUNT; index += 1) {
    signatures.add(signature(`p${index}`));
  }
  assert.equal(signatures.size, PLAYER_APPEARANCE_COUNT);
});

test('future player IDs receive a stable deterministic fallback appearance', () => {
  const first = getPlayerAppearance('academy-player-999');
  const second = getPlayerAppearance('academy-player-999');
  const different = getPlayerAppearance('academy-player-1000');

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
});