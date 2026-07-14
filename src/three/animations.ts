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

function wave(t: number, frequency: number, phase = 0): number {
  return Math.sin(t * frequency * TAU + phase);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothStep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function resetAnimatedPose({
  root,
  torso,
  head,
  leftArm,
  leftElbow,
  rightArm,
  rightElbow,
  leftLeg,
  leftKnee,
  rightLeg,
  rightKnee,
}: {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  leftElbow: THREE.Group;
  rightArm: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightLeg: THREE.Group;
  rightKnee: THREE.Group;
}): void {
  root.position.y = 0;
  root.rotation.set(0, 0, 0);
  torso.rotation.set(0, 0, 0);
  torso.scale.set(1, 1, 1);
  head.rotation.set(0, 0, 0);
  leftArm.rotation.set(0, 0, 0);
  leftElbow.rotation.set(0, 0, 0);
  rightArm.rotation.set(0, 0, 0);
  rightElbow.rotation.set(0, 0, 0);
  leftLeg.rotation.set(0, 0, 0);
  leftKnee.rotation.set(0, 0, 0);
  rightLeg.rotation.set(0, 0, 0);
  rightKnee.rotation.set(0, 0, 0);
}

export function applyAnimation(refs: BoneRefs, anim: AnimTag, t: number): void {
  const root = refs.root.current;
  const torso = refs.torso.current;
  const head = refs.head.current;
  const leftArm = refs.leftArm.current;
  const leftElbow = refs.leftElbow.current;
  const rightArm = refs.rightArm.current;
  const rightElbow = refs.rightElbow.current;
  const leftLeg = refs.leftLeg.current;
  const leftKnee = refs.leftKnee.current;
  const rightLeg = refs.rightLeg.current;
  const rightKnee = refs.rightKnee.current;

  if (
    !root || !torso || !head || !leftArm || !leftElbow || !rightArm || !rightElbow
    || !leftLeg || !leftKnee || !rightLeg || !rightKnee
  ) return;

  resetAnimatedPose({
    root,
    torso,
    head,
    leftArm,
    leftElbow,
    rightArm,
    rightElbow,
    leftLeg,
    leftKnee,
    rightLeg,
    rightKnee,
  });

  if (anim === 'idle') {
    const breathe = wave(t, 0.28) * 0.012;
    torso.scale.set(1 + breathe, 1 + breathe * 0.45, 1);
    torso.rotation.z = wave(t, 0.14) * 0.018;
    head.rotation.y = wave(t, 0.09) * 0.11;
    leftArm.rotation.z = 0.08;
    rightArm.rotation.z = -0.08;
    return;
  }

  if (anim === 'walk' || anim === 'run' || anim === 'sprint' || anim === 'dribble') {
    const running = anim === 'run' || anim === 'dribble';
    const sprinting = anim === 'sprint';
    const frequency = sprinting ? 3.25 : running ? 2.35 : 1.25;
    const swing = sprinting ? 0.74 : running ? 0.5 : 0.25;
    const stride = wave(t, frequency);
    const opposite = wave(t, frequency, Math.PI);

    torso.rotation.x = sprinting ? 0.17 : running ? 0.1 : 0.04;
    torso.rotation.z = wave(t, frequency) * (sprinting ? 0.035 : 0.018);
    head.rotation.x = sprinting ? -0.08 : -0.025;
    leftArm.rotation.x = stride * swing;
    rightArm.rotation.x = opposite * swing;
    leftElbow.rotation.x = (running ? 0.24 : 0.08) + Math.max(0, stride) * 0.28;
    rightElbow.rotation.x = (running ? 0.24 : 0.08) + Math.max(0, opposite) * 0.28;
    leftLeg.rotation.x = opposite * swing * 1.18;
    rightLeg.rotation.x = stride * swing * 1.18;
    leftKnee.rotation.x = (running ? 0.13 : 0) + Math.max(0, opposite) * 0.48;
    rightKnee.rotation.x = (running ? 0.13 : 0) + Math.max(0, stride) * 0.48;
    root.position.y = Math.abs(wave(t, frequency * 2)) * (sprinting ? 0.075 : running ? 0.045 : 0.022);

    if (anim === 'dribble') {
      torso.rotation.y = wave(t, 0.65) * 0.08;
      head.rotation.y = wave(t, 0.48) * 0.12;
    }
    return;
  }

  if (anim === 'stop') {
    torso.rotation.x = -0.07;
    leftArm.rotation.x = -0.18;
    rightArm.rotation.x = -0.18;
    leftLeg.rotation.x = -0.09;
    rightLeg.rotation.x = -0.09;
    return;
  }

  if (anim === 'kick' || anim === 'shoot') {
    const duration = anim === 'shoot' ? 1.15 : 0.92;
    const cycle = (t % duration) / duration;
    const windUp = smoothStep(cycle / 0.34);
    const strike = smoothStep((cycle - 0.34) / 0.2);
    const recovery = smoothStep((cycle - 0.58) / 0.42);
    const leg = -0.62 * windUp + 1.72 * strike - 1.1 * recovery;

    rightLeg.rotation.x = leg;
    rightKnee.rotation.x = 0.7 * windUp * (1 - strike);
    torso.rotation.x = 0.13 * strike;
    torso.rotation.y = -0.12 * windUp + 0.12 * recovery;
    leftArm.rotation.x = wave(t, 2.8) * 0.27;
    rightArm.rotation.x = wave(t, 2.8, Math.PI) * 0.27;
    return;
  }

  if (anim === 'pass') {
    const cycle = (t % 0.8) / 0.8;
    const action = Math.sin(clamp(cycle / 0.72, 0, 1) * Math.PI);
    rightLeg.rotation.x = action * 0.72;
    leftArm.rotation.x = action * 0.24;
    rightArm.rotation.x = -action * 0.32;
    torso.rotation.x = action * 0.07;
    return;
  }

  if (anim === 'header') {
    const cycle = (t % 1) / 1;
    const jump = Math.sin(cycle * Math.PI);
    root.position.y = jump * 0.42;
    head.rotation.x = cycle < 0.55 ? -jump * 0.24 : jump * 0.34;
    leftArm.rotation.x = -0.42;
    rightArm.rotation.x = -0.42;
    return;
  }

  if (anim === 'tackle') {
    const cycle = (t % 1.1) / 1.1;
    const lunge = cycle < 0.62
      ? smoothStep(cycle / 0.24)
      : 1 - smoothStep((cycle - 0.62) / 0.38);
    root.position.y = -0.16 * lunge;
    root.rotation.z = 0.12 * lunge;
    torso.rotation.x = 0.42 * lunge;
    leftArm.rotation.set(0.5 * lunge, 0, 0.25 * lunge);
    rightArm.rotation.set(0.5 * lunge, 0, -0.25 * lunge);
    leftLeg.rotation.x = 0.45 * lunge;
    rightLeg.rotation.x = -0.72 * lunge;
    rightKnee.rotation.x = 0.18 * lunge;
    return;
  }

  if (anim === 'celebrate') {
    const bounce = Math.abs(wave(t, 1.8));
    root.position.y = bounce * 0.18;
    leftArm.rotation.z = 2.35;
    rightArm.rotation.z = -2.35;
    leftElbow.rotation.x = -0.18;
    rightElbow.rotation.x = -0.18;
    torso.rotation.y = wave(t, 0.55) * 0.18;
    return;
  }

  if (anim === 'gk_dive_left' || anim === 'gk_dive_right') {
    const direction = anim === 'gk_dive_left' ? 1 : -1;
    const cycle = (t % 1.1) / 1.1;
    const dive = Math.sin(clamp(cycle, 0, 1) * Math.PI);
    root.position.y = dive * 0.26;
    root.rotation.z = direction * dive * 0.95;
    torso.rotation.x = dive * 0.18;
    leftArm.rotation.z = direction > 0 ? 1.65 * dive : -0.35 * dive;
    rightArm.rotation.z = direction < 0 ? -1.65 * dive : 0.35 * dive;
    leftLeg.rotation.x = -0.32 * dive;
    rightLeg.rotation.x = 0.32 * dive;
    return;
  }

  if (anim === 'gk_catch') {
    const reach = (wave(t, 0.72) + 1) * 0.5;
    leftArm.rotation.x = -1.05 + reach * 0.15;
    rightArm.rotation.x = -1.05 + reach * 0.15;
    leftArm.rotation.z = 0.28;
    rightArm.rotation.z = -0.28;
    leftElbow.rotation.x = -0.2;
    rightElbow.rotation.x = -0.2;
    return;
  }

  if (anim === 'gk_throw') {
    const cycle = (t % 1.2) / 1.2;
    const action = Math.sin(cycle * Math.PI);
    rightArm.rotation.x = -1.4 + action * 2.15;
    rightElbow.rotation.x = 0.42 * (1 - action);
    torso.rotation.y = -0.22 + action * 0.44;
    leftArm.rotation.x = action * 0.28;
  }
}
