import type { Vec } from '../engine/matchEngine';

export interface WorldGuidePoint {
  x: number;
  y: number;
  z: number;
}

export interface PitchGuideGeometry {
  start: WorldGuidePoint;
  end: WorldGuidePoint;
  midpoint: WorldGuidePoint;
  length: number;
  rotationY: number;
  visible: boolean;
}

export function pitchPoint(position: Vec, height = 0.075): WorldGuidePoint {
  return {
    x: (position.y / 68 - 0.5) * 6,
    y: height,
    z: (position.x / 105 - 0.5) * 10,
  };
}

export function buildPitchGuide(from: Vec, to: Vec, height = 0.075): PitchGuideGeometry {
  const start = pitchPoint(from, height);
  const end = pitchPoint(to, height);
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const length = Math.hypot(deltaX, deltaZ);

  if (length < 0.0001) {
    return {
      start,
      end,
      midpoint: { ...start },
      length: 0,
      rotationY: 0,
      visible: false,
    };
  }

  return {
    start,
    end,
    midpoint: {
      x: (start.x + end.x) * 0.5,
      y: height,
      z: (start.z + end.z) * 0.5,
    },
    length,
    rotationY: Math.atan2(deltaX, deltaZ),
    visible: true,
  };
}

export function dampAngle(current: number, target: number, smoothing: number, delta: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const blend = 1 - Math.exp(-Math.max(0, smoothing) * Math.max(0, delta));
  return current + difference * blend;
}
