import assert from 'node:assert/strict';
import test from 'node:test';
import type { InputState } from '../src/engine/matchEngine';
import { createPressInputController } from '../src/input/pressInput';

function emptyInput(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    pass: false,
    shoot: false,
    switchPlayer: false,
    slide: false,
  };
}

test('a held movement pointer stays active until that pointer is released', () => {
  const inputRef = { current: emptyInput() };
  const controller = createPressInputController(inputRef);

  controller.press('right', 11);
  assert.equal(inputRef.current.right, true);

  controller.releasePointer(11);
  assert.equal(inputRef.current.right, false);
});

test('multiple pointers support diagonal movement and independent release', () => {
  const inputRef = { current: emptyInput() };
  const controller = createPressInputController(inputRef);

  controller.press('up', 1);
  controller.press('right', 2);
  assert.equal(inputRef.current.up, true);
  assert.equal(inputRef.current.right, true);

  controller.releasePointer(1);
  assert.equal(inputRef.current.up, false);
  assert.equal(inputRef.current.right, true);

  controller.releasePointer(2);
  assert.equal(inputRef.current.right, false);
});

test('an action remains pressed while any pointer still owns it', () => {
  const inputRef = { current: emptyInput() };
  const controller = createPressInputController(inputRef);

  controller.press('shoot', 3);
  controller.press('shoot', 4);
  controller.releasePointer(3);
  assert.equal(inputRef.current.shoot, true);

  controller.releasePointer(4);
  assert.equal(inputRef.current.shoot, false);
});

test('clear releases every active control', () => {
  const inputRef = { current: emptyInput() };
  const controller = createPressInputController(inputRef);

  controller.press('left', 8);
  controller.press('pass', 9);
  controller.clear();

  assert.deepEqual(inputRef.current, emptyInput());
});
