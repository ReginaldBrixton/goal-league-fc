import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { DETAIL_MAX_DPR } from './playerPresentation';

export type CameraMode = 'hero' | 'topdown' | 'broadcast' | 'card' | 'lineup';

export interface PlayerSceneProps {
  children: ReactNode;
  cameraMode?: CameraMode;
  shadows?: boolean;
  frameloop?: 'always' | 'demand';
  className?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  maxDpr?: number;
}

const CAMERA_PRESETS: Record<CameraMode, { position: [number, number, number]; fov: number }> = {
  hero: { position: [0, 4, 8], fov: 45 },
  topdown: { position: [0, 10, 0.01], fov: 45 },
  broadcast: { position: [0, 5, 10], fov: 50 },
  card: { position: [0, 1.2, 2.5], fov: 35 },
  lineup: { position: [0, 3.5, 9], fov: 50 },
};

export function PlayerScene({
  children,
  cameraMode = 'hero',
  shadows = false,
  frameloop = 'always',
  className,
  cameraPosition,
  fov,
  maxDpr = DETAIL_MAX_DPR,
}: PlayerSceneProps) {
  const preset = CAMERA_PRESETS[cameraMode];
  const pos = cameraPosition ?? preset.position;
  const resolvedFov = fov ?? preset.fov;

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows={shadows}
        frameloop={frameloop}
        dpr={[1, Math.max(1, maxDpr)]}
        camera={{ position: pos, fov: resolvedFov, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x000000), 0);
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.2}
          castShadow={shadows}
          shadow-mapSize={shadows ? 1024 : 512}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
