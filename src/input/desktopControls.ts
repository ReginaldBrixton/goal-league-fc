export type KeyboardAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'pass'
  | 'shoot'
  | 'switchPlayer'
  | 'slide';

export function keyboardAction(code: string): KeyboardAction | null {
  switch (code) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'KeyW':
    case 'Space':
    case 'KeyJ': return 'pass';
    case 'KeyA':
    case 'KeyQ':
    case 'ShiftLeft':
    case 'ShiftRight': return 'switchPlayer';
    case 'KeyS':
    case 'KeyL': return 'slide';
    case 'KeyD':
    case 'KeyK': return 'shoot';
    default: return null;
  }
}
