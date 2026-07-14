import type { RefObject } from 'react';
import type * as THREE from 'three';

export type AnimTag =
  | 'idle' | 'walk' | 'run' | 'sprint' | 'stop'
  | 'kick' | 'pass' | 'shoot' | 'header'
  | 'tackle' | 'dribble' | 'celebrate'
  | 'gk_dive_left' | 'gk_dive_right' | 'gk_catch' | 'gk_throw';

export interface BoneRefs {
  root: RefObject<THREE.Group | null>;
  torso: RefObject<THREE.Group | null>;
  head: RefObject<THREE.Group | null>;
  leftArm: RefObject<THREE.Group | null>;
  leftElbow: RefObject<THREE.Group | null>;
  rightArm: RefObject<THREE.Group | null>;
  rightElbow: RefObject<THREE.Group | null>;
  leftLeg: RefObject<THREE.Group | null>;
  leftKnee: RefObject<THREE.Group | null>;
  rightLeg: RefObject<THREE.Group | null>;
  rightKnee: RefObject<THREE.Group | null>;
}

const TAU = Math.PI * 2;
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function sin(t: number, freq: number, phase = 0) { return Math.sin(t * freq * TAU + phase); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export function applyAnimation(refs: BoneRefs, anim: AnimTag, t: number): void {
  const root = refs.root.current;
  const torso = refs.torso.current;
  const head = refs.head.current;
  const la = refs.leftArm.current;
  const le = refs.leftElbow.current;
  const ra = refs.rightArm.current;
  const re = refs.rightElbow.current;
  const ll = refs.leftLeg.current;
  const lk = refs.leftKnee.current;
  const rl = refs.rightLeg.current;
  const rk = refs.rightKnee.current;

  if (!root || !torso || !head || !la || !le || !ra || !re || !ll || !lk || !rl || !rk) return;

  switch (anim) {
    case 'idle': {
      const breathe = sin(t, 0.3) * 0.02;
      torso.scale.set(1 + breathe, 1 + breathe * 0.5, 1);
      torso.rotation.set(0, 0, sin(t, 0.15) * 0.03);
      head.rotation.set(0, sin(t, 0.1) * 0.15, 0);
      la.rotation.set(0, 0, 0.1 + sin(t, 0.2) * 0.02);
      ra.rotation.set(0, 0, -0.1 - sin(t, 0.2) * 0.02);
      le.rotation.set(0, 0, 0.05);
      re.rotation.set(0, 0, -0.05);
      ll.rotation.set(0, 0, 0.02);
      rl.rotation.set(0, 0, -0.02);
      lk.rotation.set(0, 0, 0);
      rk.rotation.set(0, 0, 0);
      root.position.y = 0;
      break;
    }

    case 'walk': {
      const speed = 1.2;
      const swing = 0.25;
      torso.rotation.x = 0.05;
      torso.rotation.z = 0;
      head.rotation.set(0, 0, 0);
      la.rotation.x = sin(t, speed) * swing;
      ra.rotation.x = sin(t, speed, 0.5) * swing;
      le.rotation.x = Math.max(0, sin(t, speed) * 0.3);
      re.rotation.x = Math.max(0, sin(t, speed, 0.5) * 0.3);
      ll.rotation.x = sin(t, speed, 0.5) * swing * 1.2;
      rl.rotation.x = sin(t, speed) * swing * 1.2;
      lk.rotation.x = Math.max(0, sin(t, speed, 0.5) * 0.4);
      rk.rotation.x = Math.max(0, sin(t, speed) * 0.4);
      root.position.y = Math.abs(sin(t, speed * 2)) * 0.03;
      break;
    }

    case 'run': {
      const speed = 2.5;
      const swing = 0.55;
      torso.rotation.x = 0.12;
      torso.rotation.z = 0;
      head.rotation.x = -0.05;
      la.rotation.x = sin(t, speed) * swing;
      ra.rotation.x = sin(t, speed, 0.5) * swing;
      le.rotation.x = 0.3 + Math.max(0, sin(t, speed) * 0.4);
      re.rotation.x = 0.3 + Math.max(0, sin(t, speed, 0.5) * 0.4);
      ll.rotation.x = sin(t, speed, 0.5) * swing * 1.3;
      rl.rotation.x = sin(t, speed) * swing * 1.3;
      lk.rotation.x = 0.2 + Math.max(0, sin(t, speed, 0.5) * 0.6);
      rk.rotation.x = 0.2 + Math.max(0, sin(t, speed) * 0.6);
      root.position.y = Math.abs(sin(t, speed * 2)) * 0.06;
      break;
    }

    case 'sprint': {
      const speed = 3.5;
      const swing = 0.8;
      torso.rotation.x = 0.2;
      torso.rotation.z = sin(t, speed) * 0.04;
      head.rotation.x = -0.1;
      la.rotation.x = sin(t, speed) * swing;
      ra.rotation.x = sin(t, speed, 0.5) * swing;
      le.rotation.x = 0.4 + Math.max(0, sin(t, speed) * 0.5);
      re.rotation.x = 0.4 + Math.max(0, sin(t, speed, 0.5) * 0.5);
      ll.rotation.x = sin(t, speed, 0.5) * swing * 1.4;
      rl.rotation.x = sin(t, speed) * swing * 1.4;
      lk.rotation.x = 0.3 + Math.max(0, sin(t, speed, 0.5) * 0.7);
      rk.rotation.x = 0.3 + Math.max(0, sin(t, speed) * 0.7);
      root.position.y = Math.abs(sin(t, speed * 2)) * 0.1;
      break;
    }

    case 'stop': {
      torso.rotation.x = -0.08;
      torso.rotation.z = 0;
      head.rotation.set(0, 0, 0);
      la.rotation.set(-0.2, 0, 0.1);
      ra.rotation.set(-0.2, 0, -0.1);
      le.rotation.x = 0.1;
      re.rotation.x = 0.1;
      ll.rotation.x = -0.1;
      rl.rotation.x = -0.1;
      lk.rotation.set(0, 0, 0);
      rk.rotation.set(0, 0, 0);
      root.position.y = 0;
      break;
    }

    case 'kick': {
      const cycle = (t % 1.2) / 1.2;
      const windup = cycle < 0.35;
      const swing_phase = cycle >= 0.35 && cycle < 0.6;
      if (windup) {
        const p = cycle / 0.35;
        rl.rotation.x = lerp(0, -0.5, p);
        rk.rotation.x = lerp(0, 0.6, p);
        torso.rotation.x = lerp(0, 0.05, p);
      } else if (swing_phase) {
        const p = (cycle - 0.35) / 0.25;
        rl.rotation.x = lerp(-0.5, 1.2, p);
        rk.rotation.x = lerp(0.6, 0, p);
        torso.rotation.x = lerp(0.05, 0.15, p);
      } else {
        const p = (cycle - 0.6) / 0.4;
        rl.rotation.x = lerp(1.2, 0, p);
        rk.rotation.x = 0;
        torso.rotation.x = lerp(0.15, 0, p);
      }
      la.rotation.x = sin(t, 3) * 0.3;
      ra.rotation.x = sin(t, 3, 0.5) * 0.3;
      ll.rotation.x = 0;
      lk.rotation.x = 0;
      head.rotation.x = 0;
      root.position.y = 0;
      break;
    }

    case 'pass': {
      const cycle = (t % 0.8) / 0.8;
      const p = clamp(cycle / 0.3, 0, 1);
      const followP = clamp((cycle - 0.3) / 0.7, 0, 1);
      ra.rotation.x = lerp(-0.3, 0.8, p) * (1 - followP * 0.5);
      re.rotation.x = lerp(0.2, 0.5, p);
      la.rotation.x = lerp(0, 0.3, p);
      torso.rotation.x = lerp(0, 0.08, p);
      rl.rotation.x = lerp(0, 0.3, p);
      head.rotation.x = 0;
      root.position.y = 0;
      break;
    }

    case 'shoot': {
      const cycle = (t % 1.5) / 1.5;
      const windup = cycle < 0.4;
      const strike = cycle >= 0.4 && cycle < 0.65;
      if (windup) {
        const p = cycle / 0.4;
        rl.rotation.x = lerp(0, -0.7, p);
        rk.rotation.x = lerp(0, 0.8, p);
        torso.rotation.x = lerp(0, 0.08, p);
        torso.rotation.y = lerp(0, -0.15, p);
      } else if (strike) {
        const p = (cycle - 0.4) / 0.25;
        rl.rotation.x = lerp(-0.7, 1.4, p);
        rk.rotation.x = lerp(0.8, 0, p);
        torso.rotation.x = lerp(0.08, 0.2, p);
        torso.rotation.y = lerp(-0.15, 0, p);
      } else {
        const p = (cycle - 0.65) / 0.35;
        rl.rotation.x = lerp(1.4, 0, p);
        torso.rotation.x = lerp(0.2, 0, p);
        torso.rotation.y = 0;
      }
      ra.rotation.x = sin(t, 4) * 0.4;
      la.rotation.x = sin(t, 4, 0.5) * 0.4;
      ll.rotation.x = 0;
      lk.rotation.x = 0;
      head.rotation.x = 0;
      root.position.y = 0;
      break;
    }

    case 'header': {
      const cycle = (t % 1.0) / 1.0;
      const up = cycle < 0.4;
      const nod = cycle >= 0.4 && cycle < 0.6;
      if (up) {
        const p = cycle / 0.4;
        root.position.y = lerp(0, 0.5, p);
        head.rotation.x = lerp(0, -0.3, p);
      } else if (nod) {
        const p = (cycle - 0.4) / 0.2;
        head.rotation.x = lerp(-0.3, 0.4, p);
      } else {
        const p = (cycle - 0.6) / 0.4;
        root.position.y = lerp(0.5, 0, p);
        head.rotation.x = lerp(0.4, 0, p);
      }
      la.rotation.x = -0.5;
      ra.rotation.x = -0.5;
      torso.rotation.x = 0;
      break;
    }

    case 'tackle': {
      const cycle = (t % 1.2) / 1.2;
      const lunge = cycle < 0.3;
      const hold = cycle >= 0.3 && cycle < 0.7;
      if (lunge) {
        const p = cycle / 0.3;
        torso.rotation.x = lerp(0, 0.4, p);
        root.position.y = lerp(0, -0.2, p);
        la.rotation.set(lerp(0, 0.6, p), 0, lerp(0, 0.3, p));
        ra.rotation.set(lerp(0, 0.6, p), 0, lerp(0, -0.3, p));
        ll.rotation.x = lerp(0, 0.5, p);
        rl.rotation.x = lerp(0, 0.5, p);
      } else if (hold) {
        torso.rotation.x = 0.4;
        root.position.y = -0.2;
      } else {
        const p = (cycle - 0.7) / 0.3;
        torso.rotation.x = lerp(0.4, 0, p);
        root.position.y = lerp(-0.2, 0, p);
        la.rotation.set(lerp(0.6, 0, p), 0, lerp(0.3, 0, p));
        ra.rotation.set(lerp(0.6, 0, p), 0, lerp(-0.3, 0, p));
        ll.rotation.x = lerp(0.5, 0, p);
        rl.rotation.x = lerp(0.5, 0, p);
      }
      head.rotation.x = 0.1;
      break;
    }

    case 'dribble': {
      const speed = 3;
      const weave = sin(t, speed * 0.5);
      torso.rotation.z = weave * 0.08;
      torso.rotation.x = 0.08;
      head.rotation.set(0, weave * 0.1, 0);
      la.rotation.x = sin(t, speed) * 0.3;
      ra.rotation.x = sin(t, speed, 0.5) * 0.3;
      le.rotation.x = 0.15;
      re.rotation.x = 0.15;
      ll.rotation.x = sin(t, speed, 0.5) * 0.35;
      rl.rotation.x = sin(t, speed) * 0.35;
      lk.rotation.x = Math.max(0, sin(t, speed, 0.5) * 0.3);
      rk.rotation.x = Math.max(0, sin(t, speed) * 0.3);
      root.position.y = Math.abs(sin(t, speed * 2)) * 0.04;
      root.position.x = weave * 0.05;
      break;
    }

    case 'celebrate': {
      const cycle = (t % 2.0) / 2.0;
      const jump = cycle < 0.25;
      const arms = cycle >= 0.25 && cycle < 0.75;
      if (jump) {
        const p = cycle / 0.25;
        root.position.y = lerp(0, 0.6, Math.sin(p * Math.PI * 0.5));
        la.rotation.set(lerp(0, -1.8, p), 0, 0.3);
        ra.rotation.set(lerp(0, -1.8, p), 0, -0.3);
        torso.rotation.x = lerp(0, -0.1, p);
      } else if (arms) {
        root.position.y = 0.6 + sin(t, 2) * 0.05;
        la.rotation.set(-1.8 + sin(t, 3) * 0.1, 0, 0.3);
        ra.rotation.set(-1.8 + sin(t, 3, 0.5) * 0.1, 0, -0.3);
        torso.rotation.x = -0.1;
        head.rotation.set(-0.1, sin(t, 1.5) * 0.2, 0);
      } else {
        const p = (cycle - 0.75) / 0.25;
        root.position.y = lerp(0.6, 0, p);
        la.rotation.set(lerp(-1.8, 0, p), 0, lerp(0.3, 0, p));
        ra.rotation.set(lerp(-1.8, 0, p), 0, lerp(-0.3, 0, p));
        torso.rotation.x = lerp(-0.1, 0, p);
      }
      ll.rotation.x = sin(t, 4) * 0.1;
      rl.rotation.x = sin(t, 4, 0.5) * 0.1;
      break;
    }

    case 'gk_dive_left': {
      const cycle = (t % 1.5) / 1.5;
      const dive = cycle < 0.3;
      const hold_phase = cycle >= 0.3 && cycle < 0.8;
      if (dive) {
        const p = cycle / 0.3;
        root.rotation.z = lerp(0, 0.9, p);
        root.position.x = lerp(0, -0.8, p);
        root.position.y = lerp(0, -0.1, p);
        la.rotation.set(lerp(0, -1.2, p), 0, lerp(0, -0.4, p));
        ra.rotation.set(lerp(0, -0.8, p), 0, lerp(0, -0.2, p));
      } else if (hold_phase) {
        root.rotation.z = 0.9;
        root.position.x = -0.8;
        root.position.y = -0.1;
      } else {
        const p = (cycle - 0.8) / 0.2;
        root.rotation.z = lerp(0.9, 0, p);
        root.position.x = lerp(-0.8, 0, p);
        root.position.y = lerp(-0.1, 0, p);
        la.rotation.set(lerp(-1.2, 0, p), 0, lerp(-0.4, 0, p));
        ra.rotation.set(lerp(-0.8, 0, p), 0, lerp(-0.2, 0, p));
      }
      torso.rotation.x = 0;
      break;
    }

    case 'gk_dive_right': {
      const cycle = (t % 1.5) / 1.5;
      const dive = cycle < 0.3;
      const hold_phase = cycle >= 0.3 && cycle < 0.8;
      if (dive) {
        const p = cycle / 0.3;
        root.rotation.z = lerp(0, -0.9, p);
        root.position.x = lerp(0, 0.8, p);
        root.position.y = lerp(0, -0.1, p);
        ra.rotation.set(lerp(0, -1.2, p), 0, lerp(0, 0.4, p));
        la.rotation.set(lerp(0, -0.8, p), 0, lerp(0, 0.2, p));
      } else if (hold_phase) {
        root.rotation.z = -0.9;
        root.position.x = 0.8;
        root.position.y = -0.1;
      } else {
        const p = (cycle - 0.8) / 0.2;
        root.rotation.z = lerp(-0.9, 0, p);
        root.position.x = lerp(0.8, 0, p);
        root.position.y = lerp(-0.1, 0, p);
        ra.rotation.set(lerp(-1.2, 0, p), 0, lerp(0.4, 0, p));
        la.rotation.set(lerp(-0.8, 0, p), 0, lerp(0.2, 0, p));
      }
      torso.rotation.x = 0;
      break;
    }

    case 'gk_catch': {
      const cycle = (t % 1.2) / 1.2;
      const up = cycle < 0.35;
      const grab = cycle >= 0.35 && cycle < 0.7;
      if (up) {
        const p = cycle / 0.35;
        root.position.y = lerp(0, 0.4, p);
        la.rotation.set(lerp(0, -2.2, p), 0, 0.3);
        ra.rotation.set(lerp(0, -2.2, p), 0, -0.3);
        le.rotation.x = lerp(0, 0.3, p);
        re.rotation.x = lerp(0, 0.3, p);
      } else if (grab) {
        root.position.y = 0.4;
        la.rotation.set(-2.2, 0, 0.3);
        ra.rotation.set(-2.2, 0, -0.3);
        le.rotation.x = 0.3;
        re.rotation.x = 0.3;
      } else {
        const p = (cycle - 0.7) / 0.3;
        root.position.y = lerp(0.4, 0, p);
        la.rotation.set(lerp(-2.2, 0, p), 0, lerp(0.3, 0, p));
        ra.rotation.set(lerp(-2.2, 0, p), 0, lerp(-0.3, 0, p));
        le.rotation.x = lerp(0.3, 0, p);
        re.rotation.x = lerp(0.3, 0, p);
      }
      torso.rotation.x = 0;
      break;
    }

    case 'gk_throw': {
      const cycle = (t % 1.0) / 1.0;
      const windback = cycle < 0.35;
      const release = cycle >= 0.35 && cycle < 0.55;
      if (windback) {
        const p = cycle / 0.35;
        ra.rotation.set(lerp(0, -1.5, p), 0, lerp(0, 0.3, p));
        re.rotation.x = lerp(0, 0.4, p);
        torso.rotation.y = lerp(0, -0.2, p);
      } else if (release) {
        const p = (cycle - 0.35) / 0.2;
        ra.rotation.set(lerp(-1.5, 1.0, p), 0, lerp(0.3, -0.2, p));
        re.rotation.x = lerp(0.4, 0, p);
        torso.rotation.y = lerp(-0.2, 0.1, p);
      } else {
        const p = (cycle - 0.55) / 0.45;
        ra.rotation.set(lerp(1.0, 0, p), 0, lerp(-0.2, 0, p));
        torso.rotation.y = lerp(0.1, 0, p);
      }
      la.rotation.x = 0;
      break;
    }
  }
}

export function positionAnimationForPosition(pos: string): AnimTag {
  switch (pos) {
    case 'GK': return 'gk_catch';
    case 'DEF': return 'tackle';
    case 'MID': return 'pass';
    case 'FWD': return 'shoot';
    default: return 'idle';
  }
}
