import { useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { makeJerseyTexture } from './jerseyTexture';
import { applyAnimation, type AnimTag, type BoneRefs } from './animations';

export interface PlayerModelProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  teamId: string;
  primaryColor: string;
  secondaryColor: string;
  number: number;
  isGK?: boolean;
  animation?: AnimTag;
  skinColor?: string;
  highlight?: boolean;
}

const SKIN_DEFAULT = '#d4a373';

export function PlayerModel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  teamId,
  primaryColor,
  secondaryColor,
  number,
  isGK = false,
  animation = 'idle',
  skinColor = SKIN_DEFAULT,
  highlight = false,
}: PlayerModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  const boneRefs: BoneRefs = {
    root: rootRef as RefObject<THREE.Group | null>,
    torso: torsoRef as RefObject<THREE.Group | null>,
    head: headRef as RefObject<THREE.Group | null>,
    leftArm: leftArmRef as RefObject<THREE.Group | null>,
    leftElbow: leftElbowRef as RefObject<THREE.Group | null>,
    rightArm: rightArmRef as RefObject<THREE.Group | null>,
    rightElbow: rightElbowRef as RefObject<THREE.Group | null>,
    leftLeg: leftLegRef as RefObject<THREE.Group | null>,
    leftKnee: leftKneeRef as RefObject<THREE.Group | null>,
    rightLeg: rightLegRef as RefObject<THREE.Group | null>,
    rightKnee: rightKneeRef as RefObject<THREE.Group | null>,
  };

  const jerseyTex = makeJerseyTexture(
    { primary: primaryColor, secondary: secondaryColor, number, isGK },
    teamId,
  );

  const shortsColor = isGK ? '#1a1a1a' : secondaryColor;
  const socksColor = isGK ? '#f0a500' : primaryColor;

  useFrame(() => {
    const t = performance.now() / 1000;
    applyAnimation(boneRefs, animation, t);
  });

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={scale}>
      {highlight && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.35, 0.42, 32]} />
          <meshBasicMaterial color="#2fd47a" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      <group ref={torsoRef} position={[0, 0.55, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.5, 0.22]} />
          <meshStandardMaterial map={jerseyTex} roughness={0.6} />
        </mesh>

        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.36, 0.22, 0.2]} />
          <meshStandardMaterial color={shortsColor} roughness={0.7} />
        </mesh>

        <group ref={headRef} position={[0, 0.38, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.14, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={isGK ? '#1a1a1a' : primaryColor} roughness={0.4} />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[0.24, 0.2, 0]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.22, 8, 8]} />
            <meshStandardMaterial color={isGK ? '#f0a500' : primaryColor} roughness={0.6} />
          </mesh>
          <group ref={leftElbowRef} position={[0, -0.3, 0]}>
            <mesh castShadow position={[0, -0.1, 0]}>
              <capsuleGeometry args={[0.05, 0.18, 8, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>
          </group>
        </group>

        <group ref={rightArmRef} position={[-0.24, 0.2, 0]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.22, 8, 8]} />
            <meshStandardMaterial color={isGK ? '#f0a500' : primaryColor} roughness={0.6} />
          </mesh>
          <group ref={rightElbowRef} position={[0, -0.3, 0]}>
            <mesh castShadow position={[0, -0.1, 0]}>
              <capsuleGeometry args={[0.05, 0.18, 8, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>
          </group>
        </group>

        <group ref={leftLegRef} position={[0.1, -0.46, 0]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.07, 0.25, 8, 8]} />
            <meshStandardMaterial color={shortsColor} roughness={0.7} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.3, 0]}>
            <mesh castShadow position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.06, 0.22, 8, 8]} />
              <meshStandardMaterial color={socksColor} roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, -0.3, 0.06]}>
              <boxGeometry args={[0.1, 0.05, 0.2]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
          </group>
        </group>

        <group ref={rightLegRef} position={[-0.1, -0.46, 0]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.07, 0.25, 8, 8]} />
            <meshStandardMaterial color={shortsColor} roughness={0.7} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.3, 0]}>
            <mesh castShadow position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.06, 0.22, 8, 8]} />
              <meshStandardMaterial color={socksColor} roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, -0.3, 0.06]}>
              <boxGeometry args={[0.1, 0.05, 0.2]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
