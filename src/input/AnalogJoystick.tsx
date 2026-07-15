import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { InputState } from '../engine/matchEngine';
import { resolveAnalogStick, type AnalogStickVector } from './analogJoystickMath';
import './analogInputTypes';

const RESTING_STICK: AnalogStickVector = {
  x: 0,
  y: 0,
  magnitude: 0,
  visualX: 0,
  visualY: 0,
};

interface AnalogJoystickProps {
  inputRef: MutableRefObject<InputState>;
  disabled?: boolean;
}

export function AnalogJoystick({ inputRef, disabled = false }: AnalogJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const [stick, setStick] = useState<AnalogStickVector>(RESTING_STICK);

  const writeStick = useCallback((next: AnalogStickVector) => {
    inputRef.current.moveX = next.x;
    inputRef.current.moveY = next.y;
    setStick(next);
  }, [inputRef]);

  const release = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && activePointerRef.current !== pointerId) return;
    activePointerRef.current = null;
    writeStick(RESTING_STICK);
  }, [writeStick]);

  const updateFromPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base || activePointerRef.current !== event.pointerId) return;
    const rect = base.getBoundingClientRect();
    const centreX = rect.left + rect.width / 2;
    const centreY = rect.top + rect.height / 2;
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.42);
    writeStick(resolveAnalogStick(event.clientX - centreX, event.clientY - centreY, radius));
  }, [writeStick]);

  useEffect(() => {
    if (disabled) release();
  }, [disabled, release]);

  useEffect(() => {
    const clear = () => release();
    const onVisibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
  }, [release]);

  const style = {
    '--joystick-x': `${stick.visualX * 41}px`,
    '--joystick-y': `${stick.visualY * 41}px`,
    '--joystick-power': stick.magnitude,
  } as CSSProperties;

  return (
    <div
      ref={baseRef}
      className={`game-joystick${stick.magnitude > 0 ? ' is-active' : ''}`}
      role="application"
      aria-label="Analogue movement joystick. Drag in any direction to move the player."
      data-active={stick.magnitude > 0 ? 'true' : 'false'}
      data-magnitude={stick.magnitude.toFixed(3)}
      style={style}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled || activePointerRef.current !== null) return;
        activePointerRef.current = event.pointerId;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is an enhancement; movement still works without it.
        }
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (activePointerRef.current !== event.pointerId) return;
        event.preventDefault();
        updateFromPointer(event);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        release(event.pointerId);
        try {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        } catch {
          // The browser may already have released capture.
        }
      }}
      onPointerCancel={(event) => release(event.pointerId)}
      onLostPointerCapture={(event) => release(event.pointerId)}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className="joystick-orbit orbit-outer" aria-hidden="true" />
      <span className="joystick-orbit orbit-inner" aria-hidden="true" />
      <span className="joystick-axis axis-horizontal" aria-hidden="true" />
      <span className="joystick-axis axis-vertical" aria-hidden="true" />
      <span className="joystick-thumb" aria-hidden="true">
        <i />
      </span>
      <output className="joystick-output" aria-live="off">
        {Math.round(stick.magnitude * 100)}%
      </output>
    </div>
  );
}
