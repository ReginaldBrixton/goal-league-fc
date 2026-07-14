import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Pitch3D } from './Pitch3D';
import { PlayerModel } from './PlayerModel';

function LandingCameraRig() {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    target.current.set(pointer.x * 0.55, 1.1 + pointer.y * 0.18, 0);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(t * 0.13) * 1.25 + pointer.x * 0.5, 0.025);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3.7 + pointer.y * 0.25, 0.025);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7.4, 0.025);
    camera.lookAt(target.current);
  });

  return null;
}

function Stadium() {
  return (
    <group>
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <cylinderGeometry args={[7.4, 7.9, 0.35, 64]} />
        <meshStandardMaterial color="#070b11" roughness={0.82} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.2, 0.42, 12, 80]} />
        <meshStandardMaterial color="#15202c" roughness={0.68} metalness={0.28} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.6, 2.6, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 4.6, 0.12]} />
            <meshStandardMaterial color="#344254" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.85, 0.18, 1.8]} />
            <meshStandardMaterial color="#eaf8ff" emissive="#c5edff" emissiveIntensity={1.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function LandingScene3D() {
  const squadRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!squadRef.current) return;
    squadRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.08;
  });

  return (
    <>
      <fog attach="fog" args={['#071019', 8, 19]} />
      <LandingCameraRig />
      <Stadium />
      <group position={[0, 0, 0.2]}>
        <Pitch3D width={6.4} length={10.4} />
      </group>
      <group ref={squadRef}>
        <PlayerModel
          position={[0, 0.04, 0.4]}
          rotation={[0, Math.PI, 0]}
          scale={1.35}
          teamId="landing-alpha"
          primaryColor="#20e58b"
          secondaryColor="#071b13"
          number={10}
          animation="dribble"
          skinColor="#8f5b3f"
          highlight
        />
        <PlayerModel
          position={[-1.55, 0.04, -0.2]}
          rotation={[0, 2.72, 0]}
          scale={1.13}
          teamId="landing-alpha"
          primaryColor="#20e58b"
          secondaryColor="#071b13"
          number={7}
          animation="run"
          skinColor="#d6a079"
        />
        <PlayerModel
          position={[1.55, 0.04, -0.55]}
          rotation={[0, 3.55, 0]}
          scale={1.16}
          teamId="landing-beta"
          primaryColor="#1768ff"
          secondaryColor="#f4f8ff"
          number={4}
          animation="tackle"
          skinColor="#5c382b"
        />
      </group>
      <mesh position={[0.42, 0.2, 0.92]} castShadow>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color="#f8fbff" roughness={0.42} metalness={0.08} />
      </mesh>
      <spotLight position={[0, 7, 4]} angle={0.56} penumbra={0.72} intensity={3.2} color="#d8fff0" castShadow />
      <pointLight position={[-4, 2, 2]} intensity={2.2} color="#20e58b" />
      <pointLight position={[4, 2, -1]} intensity={2.1} color="#1768ff" />
    </>
  );
}
