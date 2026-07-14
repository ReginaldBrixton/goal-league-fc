import { useMemo, useRef, type RefObject } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { applyAnimation, type AnimTag, type BoneRefs } from './animations';
import { makeJerseyTexture } from './jerseyTexture';

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
  variant?: 'detail' | 'match';
  shadows?: boolean;
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
  variant = 'detail',
  shadows = true,
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

  const detailed = variant === 'detail';
  const segments = detailed ? 16 : 8;
  const jerseyTexture = useMemo(
    () => detailed
      ? makeJerseyTexture(
        { primary: primaryColor, secondary: secondaryColor, number, isGK },
        teamId,
      )
      : null,
    [detailed, isGK, number, primaryColor, secondaryColor, teamId],
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
    <group position={position} rotation={rotation} scale={scale}>
      <group ref={rootRef}>
        {highlight && (
          <group position={[0, 0.018, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[detailed ? 0.32 : 0.26, detailed ? 0.41 : 0.34, detailed ? 40 : 24]} />
              <meshBasicMaterial color="#35f38d" transparent opacity={0.82} side={THREE.DoubleSide} />
            </mesh>
            <pointLight position={[0, 0.08, 0]} intensity={detailed ? 0.45 : 0.24} distance={1.35} color="#35f38d" />
          </group>
        )}

        <group ref={torsoRef} position={[0, 0.82, 0]}>
          <RoundedBox args={[0.42, 0.52, 0.22]} radius={0.07} smoothness={detailed ? 4 : 2} castShadow={shadows}>
            {detailed && jerseyTexture ? (
              <meshPhysicalMaterial map={jerseyTexture} roughness={0.52} clearcoat={0.12} clearcoatRoughness={0.62} />
            ) : (
              <meshStandardMaterial color={primaryColor} roughness={0.62} />
            )}
          </RoundedBox>

          {!detailed && (
            <mesh position={[0, 0.01, 0.116]} castShadow={false}>
              <boxGeometry args={[0.27, 0.075, 0.012]} />
              <meshStandardMaterial color={secondaryColor} roughness={0.7} />
            </mesh>
          )}

          <mesh position={[0, 0.315, 0]} castShadow={shadows}>
            <cylinderGeometry args={[0.064, 0.078, 0.11, segments]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>

          <RoundedBox
            args={[0.36, 0.18, 0.23]}
            radius={0.045}
            smoothness={detailed ? 3 : 2}
            position={[0, -0.36, 0]}
            castShadow={shadows}
          >
            <meshStandardMaterial color={shortsColor} roughness={0.72} />
          </RoundedBox>

          <group ref={headRef} position={[0, 0.48, 0]}>
            <mesh castShadow={shadows} scale={[0.92, 1.04, 0.9]}>
              <sphereGeometry args={[0.145, detailed ? 20 : 10, detailed ? 16 : 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.098, -0.004]} scale={[0.96, 0.54, 0.93]} castShadow={shadows}>
              <sphereGeometry args={[0.152, detailed ? 18 : 10, detailed ? 14 : 8, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>

            {detailed && (
              <>
                {[-0.052, 0.052].map((x) => (
                  <group key={x}>
                    <mesh position={[x, 0.017, 0.124]}>
                      <sphereGeometry args={[0.012, 8, 8]} />
                      <meshStandardMaterial color="#f7fbff" roughness={0.25} />
                    </mesh>
                    <mesh position={[x, 0.017, 0.134]}>
                      <sphereGeometry args={[0.0055, 6, 6]} />
                      <meshStandardMaterial color="#111820" />
                    </mesh>
                  </group>
                ))}
                <mesh position={[0, -0.03, 0.133]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.016, 0.035, 8]} />
                  <meshStandardMaterial color={skinColor} roughness={0.55} />
                </mesh>
                <mesh position={[0, -0.077, 0.129]} scale={[1.3, 0.4, 0.4]}>
                  <sphereGeometry args={[0.023, 10, 8]} />
                  <meshStandardMaterial color="#5a2526" roughness={0.7} />
                </mesh>
              </>
            )}
          </group>

          <group ref={leftArmRef} position={[0.245, 0.18, 0]}>
            <mesh castShadow={shadows} position={[0, -0.125, 0]}>
              <capsuleGeometry args={[0.055, 0.19, detailed ? 8 : 4, segments]} />
              <meshStandardMaterial color={sleeveColor} roughness={0.6} />
            </mesh>
            <group ref={leftElbowRef} position={[0, -0.27, 0]}>
              <mesh castShadow={shadows} position={[0, -0.105, 0]}>
                <capsuleGeometry args={[0.044, 0.16, detailed ? 7 : 4, segments]} />
                <meshStandardMaterial color={skinColor} roughness={0.58} />
              </mesh>
              <mesh position={[0, -0.22, 0.008]} castShadow={shadows}>
                <sphereGeometry args={[0.052, segments, Math.max(6, segments - 2)]} />
                <meshStandardMaterial color={skinColor} roughness={0.55} />
              </mesh>
            </group>
          </group>

          <group ref={rightArmRef} position={[-0.245, 0.18, 0]}>
            <mesh castShadow={shadows} position={[0, -0.125, 0]}>
              <capsuleGeometry args={[0.055, 0.19, detailed ? 8 : 4, segments]} />
              <meshStandardMaterial color={sleeveColor} roughness={0.6} />
            </mesh>
            <group ref={rightElbowRef} position={[0, -0.27, 0]}>
              <mesh castShadow={shadows} position={[0, -0.105, 0]}>
                <capsuleGeometry args={[0.044, 0.16, detailed ? 7 : 4, segments]} />
                <meshStandardMaterial color={skinColor} roughness={0.58} />
              </mesh>
              <mesh position={[0, -0.22, 0.008]} castShadow={shadows}>
                <sphereGeometry args={[0.052, segments, Math.max(6, segments - 2)]} />
                <meshStandardMaterial color={skinColor} roughness={0.55} />
              </mesh>
            </group>
          </group>

          <group ref={leftLegRef} position={[0.105, -0.45, 0]}>
            <mesh castShadow={shadows} position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.066, 0.23, detailed ? 8 : 4, segments]} />
              <meshStandardMaterial color={shortsColor} roughness={0.7} />
            </mesh>
            <group ref={leftKneeRef} position={[0, -0.31, 0]}>
              <mesh castShadow={shadows} position={[0, -0.145, 0]}>
                <capsuleGeometry args={[0.052, 0.22, detailed ? 7 : 4, segments]} />
                <meshStandardMaterial color={socksColor} roughness={0.7} />
              </mesh>
              <RoundedBox args={[0.115, 0.07, 0.24]} radius={0.025} smoothness={2} position={[0, -0.31, 0.065]} castShadow={shadows}>
                <meshStandardMaterial color={bootColor} roughness={0.4} metalness={0.05} />
              </RoundedBox>
            </group>
          </group>

          <group ref={rightLegRef} position={[-0.105, -0.45, 0]}>
            <mesh castShadow={shadows} position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.066, 0.23, detailed ? 8 : 4, segments]} />
              <meshStandardMaterial color={shortsColor} roughness={0.7} />
            </mesh>
            <group ref={rightKneeRef} position={[0, -0.31, 0]}>
              <mesh castShadow={shadows} position={[0, -0.145, 0]}>
                <capsuleGeometry args={[0.052, 0.22, detailed ? 7 : 4, segments]} />
                <meshStandardMaterial color={socksColor} roughness={0.7} />
              </mesh>
              <RoundedBox args={[0.115, 0.07, 0.24]} radius={0.025} smoothness={2} position={[0, -0.31, 0.065]} castShadow={shadows}>
                <meshStandardMaterial color={bootColor} roughness={0.4} metalness={0.05} />
              </RoundedBox>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
