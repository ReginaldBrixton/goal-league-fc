import assert from 'node:assert/strict';
import test from 'node:test';
import { keyboardAction } from '../src/input/desktopControls';

test('arrow keys exclusively map to player movement', () => {
  assert.equal(keyboardAction('ArrowUp'), 'up');
  assert.equal(keyboardAction('ArrowDown'), 'down');
  assert.equal(keyboardAction('ArrowLeft'), 'left');
  assert.equal(keyboardAction('ArrowRight'), 'right');
});

test('WASD maps to pass, switch, tackle and shoot', () => {
  assert.equal(keyboardAction('KeyW'), 'pass');
  assert.equal(keyboardAction('KeyA'), 'switchPlayer');
  assert.equal(keyboardAction('KeyS'), 'slide');
  assert.equal(keyboardAction('KeyD'), 'shoot');
});

test('legacy action shortcuts remain available without stealing arrow movement', () => {
  assert.equal(keyboardAction('Space'), 'pass');
  assert.equal(keyboardAction('KeyJ'), 'pass');
  assert.equal(keyboardAction('KeyK'), 'shoot');
  assert.equal(keyboardAction('KeyL'), 'slide');
  assert.equal(keyboardAction('KeyQ'), 'switchPlayer');
  assert.equal(keyboardAction('ShiftLeft'), 'switchPlayer');
  assert.equal(keyboardAction('Unknown'), null);
});