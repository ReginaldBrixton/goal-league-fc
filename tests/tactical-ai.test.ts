import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignDefensiveRoles,
  createTacticalMemory,
  getAIProfile,
  updateTacticalMemory,
  defensiveLaneOffset,
  type TacticalActor,
} from '../src/engine/tacticalAI';

const actors: TacticalActor[] = [
  { id: 'def-1', position: 'DEF', distanceToCarrier: 3 },
  { id: 'mid-1', position: 'MID', distanceToCarrier: 5 },
  { id: 'mid-2', position: 'MID', distanceToCarrier: 7 },
  { id: 'def-2', position: 'DEF', distanceToCarrier: 10 },
  { id: 'fwd-1', position: 'FWD', distanceToCarrier: 12 },
];

test('defensive assignments use one presser, two cover players and preserve team shape', () => {
  const assignments = assignDefensiveRoles(actors, getAIProfile('professional'));
  const roles = [...assignments.values()];

  assert.equal(roles.filter((role) => role === 'press').length, 1);
  assert.equal(roles.filter((role) => role === 'cover').length, 2);
  assert.ok(roles.filter((role) => role === 'shape').length >= 2);
});

test('online tactical memory learns the lane repeatedly used by the human player', () => {
  let memory = createTacticalMemory();
  for (let index = 0; index < 20; index++) {
    memory = updateTacticalMemory(memory, { lane: 'right', passed: index % 3 === 0, shot: false }, 0.22);
  }

  assert.ok(memory.lanes.right > memory.lanes.center);
  assert.ok(memory.lanes.right > memory.lanes.left);
  assert.ok(memory.passRate > 0);
});

test('defensive block shifts toward the learned attacking lane without abandoning shape', () => {
  let memory = createTacticalMemory();
  for (let index = 0; index < 16; index++) {
    memory = updateTacticalMemory(memory, { lane: 'left', passed: false, shot: false }, 0.25);
  }

  const offset = defensiveLaneOffset(memory, getAIProfile('legend'));
  assert.ok(offset < 0);
  assert.ok(offset >= -7);
});

test('higher difficulty profiles react faster and adapt more strongly', () => {
  const rookie = getAIProfile('rookie');
  const legend = getAIProfile('legend');

  assert.ok(legend.reactionSeconds < rookie.reactionSeconds);
  assert.ok(legend.adaptationRate > rookie.adaptationRate);
  assert.ok(legend.compactness > rookie.compactness);
});
