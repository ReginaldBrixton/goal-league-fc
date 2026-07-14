import type { InputState } from '../engine/matchEngine';

export type DigitalInputAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'pass'
  | 'shoot'
  | 'switchPlayer'
  | 'slide';

interface InputRef {
  current: InputState;
}

export interface PressInputController {
  press: (action: DigitalInputAction, pointerId: number) => void;
  releasePointer: (pointerId: number) => void;
  clear: () => void;
  isPressed: (action: DigitalInputAction) => boolean;
  activeActions: () => DigitalInputAction[];
}

const DIGITAL_ACTIONS: DigitalInputAction[] = [
  'up',
  'down',
  'left',
  'right',
  'pass',
  'shoot',
  'switchPlayer',
  'slide',
];

export function createPressInputController(
  inputRef: InputRef,
  onChange?: (actions: DigitalInputAction[]) => void,
): PressInputController {
  const pointerActions = new Map<number, DigitalInputAction>();
  const actionPointers = new Map<DigitalInputAction, Set<number>>();

  const notify = () => onChange?.(DIGITAL_ACTIONS.filter((action) => Boolean(inputRef.current[action])));

  const releasePointer = (pointerId: number) => {
    const action = pointerActions.get(pointerId);
    if (!action) return;

    pointerActions.delete(pointerId);
    const pointers = actionPointers.get(action);
    pointers?.delete(pointerId);
    if (!pointers || pointers.size === 0) {
      actionPointers.delete(action);
      inputRef.current[action] = false;
    }
    notify();
  };

  const press = (action: DigitalInputAction, pointerId: number) => {
    const existing = pointerActions.get(pointerId);
    if (existing === action) return;
    if (existing) releasePointer(pointerId);

    pointerActions.set(pointerId, action);
    const pointers = actionPointers.get(action) ?? new Set<number>();
    pointers.add(pointerId);
    actionPointers.set(action, pointers);
    inputRef.current[action] = true;
    notify();
  };

  const clear = () => {
    pointerActions.clear();
    actionPointers.clear();
    for (const action of DIGITAL_ACTIONS) inputRef.current[action] = false;
    notify();
  };

  return {
    press,
    releasePointer,
    clear,
    isPressed: (action) => Boolean(inputRef.current[action]),
    activeActions: () => DIGITAL_ACTIONS.filter((action) => Boolean(inputRef.current[action])),
  };
}
