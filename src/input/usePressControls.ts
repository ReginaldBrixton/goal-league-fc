import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import type { InputState } from '../engine/matchEngine';
import { createPressInputController, type DigitalInputAction } from './pressInput';

interface PressHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
}

export function usePressControls(
  inputRef: MutableRefObject<InputState>,
  disabled: boolean,
): {
  bindPress: (action: DigitalInputAction) => PressHandlers;
  pressedActions: Set<DigitalInputAction>;
  clearPresses: () => void;
} {
  const [pressedActions, setPressedActions] = useState<Set<DigitalInputAction>>(() => new Set());
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const controllerRef = useRef<ReturnType<typeof createPressInputController> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createPressInputController(inputRef, (actions) => {
      setPressedActions(new Set(actions));
    });
  }

  const clearPresses = useCallback(() => {
    controllerRef.current?.clear();
  }, []);

  useEffect(() => {
    if (disabled) clearPresses();
  }, [clearPresses, disabled]);

  useEffect(() => () => clearPresses(), [clearPresses]);

  const bindPress = useCallback((action: DigitalInputAction): PressHandlers => {
    const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      controllerRef.current?.releasePointer(event.pointerId);
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Pointer capture may already have been released by the browser.
      }
    };

    return {
      onPointerDown: (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabledRef.current) return;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The control still functions on browsers that do not support capture.
        }
        controllerRef.current?.press(action, event.pointerId);
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: (event) => {
        controllerRef.current?.releasePointer(event.pointerId);
      },
      onContextMenu: (event) => event.preventDefault(),
      onDragStart: (event) => event.preventDefault(),
    };
  }, []);

  return { bindPress, pressedActions, clearPresses };
}
