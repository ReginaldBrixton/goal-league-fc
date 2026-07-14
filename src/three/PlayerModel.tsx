import { useMemo, useRef, type RefObject } from 'react';
import { RoundedBox } from '@react-three/drei';
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

  const jerseyTexture = useMemo(
    () => makeJerseyTexture(
      { primary: primaryColor, secondary: secondaryColor, number, isGK },
      teamId,
    ),
    [isGK, number, primaryColor, secondaryColor, teamId],
  );

  const shortsColor = isGK ? '#141a22' : secondaryColor;
  const socksColor = isGK ? '#e7a719' : primaryColor;
  const sleeveColor = isGK ? '#e7a719' : primaryColor;
  const bootColor = number % 3 === 0 ? '#f7fbff' : number % 3 === 1 ? '#0b1118' : '#d9ff2f';
  const hairColor = number % 4 === 0 ? '#221812' : number % 4 === 1 ? '#090b0d' : number % 4 === 2 ? '#4a2b1a' : '#2b1d17';

  useFrame(() => {
    applyAnimation(boneRefs, animation, performance.now() / 1000);
  });

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={scale}>
      {highlight && (
        <group position={[0, 0.015, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.34, 0.43, 48]} />
            <meshBasicMaterial color="#35f38d" transparent opacity={0.82} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 0.08, 0]} intensity={0.5} distance={1.5} color="#35f38d" />
        </group>
      )}

      <group ref={torsoRef} position={[0, 0.76, 0]}>
        <RoundedBox args={[0.46, 0.54, 0.25]} radius={0.09} smoothness={5} castShadow>
          <meshPhysicalMaterial map={jerseyTexture} roughness={0.48} clearcoat={0.18} clearcoatRoughness={0.58} />
        </RoundedBox>

        <mesh position={[0, 0.315, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.09, 0.12, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.58} />
        </mesh>

        <mesh position={[0, -0.36, 0]} castShadow>
          <capsuleGeometry args={[0.205, 0.13, 8, 16]} />
          <meshStandardMaterial color={shortsColor} roughness={0.7} />
        </mesh>

        <group ref={headRef} position={[0, 0.49, 0]}>
          <mesh castShadow scale={[0.92, 1.06, 0.9]}>
            <sphereGeometry args={[0.155, 24, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.56} />
          </mesh>
          <mesh position={[0, 0.105, -0.004]} scale={[0.96, 0.56, 0.93]} castShadow>
            <sphereGeometry args={[0.162, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
          <mesh position={[-0.056, 0.018, 0.132]}>
            <sphereGeometry args={[0.013, 10, 10]} />
            <meshStandardMaterial color="#f7fbff" roughness={0.25} />
          </mesh>
          <mesh position={[0.056, 0.018, 0.132]}>
            <sphereGeometry args={[0.013, 10, 10]} />
            <meshStandardMaterial color="#f7fbff" roughness={0.25} />
          </mesh>
          <mesh position={[-0.056, 0.018, 0.143]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshStandardMaterial color="#111820" />
          </mesh>
          <mesh position={[0.056, 0.018, 0.143]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshStandardMaterial color="#111820" />
          </mesh>
          <mesh position={[0, -0.028, 0.147]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.018, 0.04, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.08, 0.137]} scale={[1.4, 0.45, 0.45]}>
            <sphereGeometry args={[0.025, 12, 8]} />
            <meshStandardMaterial color="#5a2526" roughness={0.7} />
          </mesh>
          <mesh position={[-0.152, 0, 0]} scale={[0.35, 0.7, 0.24]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
          <mesh position={[0.152, 0, 0]} scale={[0.35, 0.7, 0.24]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color={skinColor} />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[0.27, 0.19, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <capsuleGeometry args={[0.068, 0.22, 10, 14]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.008, 0]} castShadow>
            <sphereGeometry args={[0.075, 14, 12]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.58} />
          </mesh>
          <group ref={leftElbowRef} position={[0, -0.3, 0]}>
            <mesh castShadow position={[0, -0.115, 0]}>
              <capsuleGeometry args={[0.052, 0.18, 9, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.25, 0.012]} castShadow>
              <sphereGeometry args={[0.064, 14, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.52} />
            </mesh>
          </group>
        </group>

        <group ref={rightArmRef} position={[-0.27, 0.19, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <capsuleGeometry args={[0.068, 0.22, 10, 14]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.008, 0]} castShadow>
            <sphereGeometry args={[0.075, 14, 12]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.58} />
          </mesh>
          <group ref={rightElbowRef} position={[0, -0.3, 0]}>
            <mesh castShadow position={[0, -0.115, 0]}>
              <capsuleGeometry args={[0.052, 0.18, 9, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.25, 0.012]} castShadow>
              <sphereGeometry args={[0.064, 14, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.52} />
            </mesh>
          </group>
        </group>

        <group ref={leftLegRef} position={[0.12, -0.47, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.082, 0.28, 10, 14]} />
            <meshStandardMaterial color={shortsColor} roughness={0.68} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.35, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[0.076, 14, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.58} />
            </mesh>
            <mesh castShadow position={[0, -0.17, 0]}>
              <capsuleGeometry args={[0.064, 0.23, 9, 12]} />
              <meshStandardMaterial color={socksColor} roughness={0.68} />
            </mesh>
            <RoundedBox args={[0.13, 0.085, 0.27]} radius={0.035} smoothness={4} position={[0, -0.36, 0.075]} castShadow>
              <meshStandardMaterial color={bootColor} roughness={0.35} metalness={0.08} />
            </RoundedBox>
            {[-0.038, 0.038].map((x) => (
              <mesh key={x} position={[x, -0.414, 0.08]}>
                <cylinderGeometry args={[0.012, 0.016, 0.025, 8]} />
                <meshStandardMaterial color="#05080b" />
              </mesh>
            ))}
          </group>
        </group>

        <group ref={rightLegRef} position={[-0.12, -0.47, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.082, 0.28, 10, 14]} />
            <meshStandardMaterial color={shortsColor} roughness={0.68} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.35, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[0.076, 14, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.58} />
            </mesh>
            <mesh castShadow position={[0, -0.17, 0]}>
              <capsuleGeometry args={[0.064, 0.23, 9, 12]} />
              <meshStandardMaterial color={socksColor} roughness={0.68} />
            </mesh>
            <RoundedBox args={[0.13, 0.085, 0.27]} radius={0.035} smoothness={4} position={[0, -0.36, 0.075]} castShadow>
              <meshStandardMaterial color={bootColor} roughness={0.35} metalness={0.08} />
            </RoundedBox>
            {[-0.038, 0.038].map((x) => (
              <mesh key={x} position={[x, -0.414, 0.08]}>
                <cylinderGeometry args={[0.012, 0.016, 0.025, 8]} />
                <meshStandardMaterial color="#05080b" />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
