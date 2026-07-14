import type { MatchCamera } from '../utils/matchSettings';

export interface CameraPoint {
  x: number;
  y: number;
  z: number;
}

export interface MatchCameraPose {
  position: CameraPoint;
  lookAt: CameraPoint;
  lerp: number;
}

export function getMatchCameraPose(
  mode: MatchCamera,
  aspect: number,
  focus: CameraPoint,
): MatchCameraPose {
  const portrait = aspect > 0 && aspect < 0.78;

  if (mode === 'tactical') {
    return {
      position: { x: 0, y: portrait ? 11.2 : 9.6, z: 0.05 },
      lookAt: { x: 0, y: 0, z: 0 },
      lerp: 0.065,
    };
  }

  if (mode === 'dynamic') {
    if (portrait) {
      return {
        position: {
          x: focus.x * 0.24 + 6.25,
          y: 5.8,
          z: focus.z - 2.3,
        },
        lookAt: {
          x: focus.x * 0.5,
          y: 0.08,
          z: focus.z + 0.65,
        },
        lerp: 0.055,
      };
    }

    return {
      position: {
        x: focus.x * 0.55 + 4.1,
        y: 3.1,
        z: focus.z - 4.7,
      },
      lookAt: { x: focus.x, y: 0.2, z: focus.z + 0.7 },
      lerp: 0.045,
    };
  }

  if (portrait) {
    return {
      position: {
        x: focus.x * 0.14 + 6.8,
        y: 6.45,
        z: focus.z + 2.45,
      },
      lookAt: {
        x: focus.x * 0.28,
        y: 0.04,
        z: focus.z + 0.25,
      },
      lerp: 0.06,
    };
  }

  return {
    position: {
      x: focus.x * 0.24 + 5.5,
      y: 4.2,
      z: focus.z * 0.35 + 1.8,
    },
    lookAt: { x: focus.x * 0.72, y: 0.08, z: focus.z },
    lerp: 0.045,
  };
}
