import { useMemo } from 'react';
import * as THREE from 'three';

export interface Pitch3DProps {
  width?: number;
  length?: number;
  rotateY?: number;
  showBall?: boolean;
}

function createLineMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 });
}

function makeLine(points: [number, number, number][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points.flat()), 3));
  return geometry;
}

function makeCircle(radius: number, y: number, segments = 96): THREE.BufferGeometry {
  const points: [number, number, number][] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    points.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }
  return makeLine(points);
}

export function Pitch3D({ width = 6, length = 10, rotateY = 0, showBall = true }: Pitch3DProps) {
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#28622f');
    gradient.addColorStop(0.5, '#1f5429');
    gradient.addColorStop(1, '#173f22');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x += 64) {
      context.fillStyle = x % 128 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
      context.fillRect(x, 0, 64, 512);
    }

    for (let index = 0; index < 1600; index += 1) {
      const alpha = 0.015 + Math.random() * 0.035;
      context.fillStyle = `rgba(220,255,210,${alpha})`;
      context.fillRect(Math.random() * 512, Math.random() * 512, 1, 4 + Math.random() * 5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 5);
    texture.anisotropy = 8;
    return texture;
  }, []);

  const lineMaterial = useMemo(() => createLineMaterial(), []);
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const lineY = 0.026;

  const lines = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    geometries.push(makeLine([[-halfWidth, lineY, -halfLength], [halfWidth, lineY, -halfLength], [halfWidth, lineY, halfLength], [-halfWidth, lineY, halfLength], [-halfWidth, lineY, -halfLength]]));
    geometries.push(makeLine([[-halfWidth, lineY, 0], [halfWidth, lineY, 0]]));
    geometries.push(makeCircle(0.595, lineY));

    const boxWidth = width * 0.61;
    const boxLength = length * 0.16;
    geometries.push(makeLine([[-boxWidth / 2, lineY, -halfLength], [boxWidth / 2, lineY, -halfLength], [boxWidth / 2, lineY, -halfLength + boxLength], [-boxWidth / 2, lineY, -halfLength + boxLength], [-boxWidth / 2, lineY, -halfLength]]));
    geometries.push(makeLine([[boxWidth / 2, lineY, halfLength], [-boxWidth / 2, lineY, halfLength], [-boxWidth / 2, lineY, halfLength - boxLength], [boxWidth / 2, lineY, halfLength - boxLength], [boxWidth / 2, lineY, halfLength]]));

    const sixWidth = width * 0.3;
    const sixLength = length * 0.065;
    geometries.push(makeLine([[-sixWidth / 2, lineY, -halfLength], [sixWidth / 2, lineY, -halfLength], [sixWidth / 2, lineY, -halfLength + sixLength], [-sixWidth / 2, lineY, -halfLength + sixLength], [-sixWidth / 2, lineY, -halfLength]]));
    geometries.push(makeLine([[sixWidth / 2, lineY, halfLength], [-sixWidth / 2, lineY, halfLength], [-sixWidth / 2, lineY, halfLength - sixLength], [sixWidth / 2, lineY, halfLength - sixLength], [sixWidth / 2, lineY, halfLength]]));
    return geometries;
  }, [halfLength, halfWidth, length, width]);

  return (
    <group rotation={[0, rotateY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length, 16, 24]} />
        <meshStandardMaterial map={grassTexture} roughness={0.92} metalness={0.01} />
      </mesh>

      {lines.map((geometry, index) => (
        <primitive key={index} object={new THREE.Line(geometry, lineMaterial)} />
      ))}

      {[-1, 1].map((end) => (
        <group key={end} position={[0, 0, end * (halfLength + 0.2)]} rotation={[0, end === 1 ? Math.PI : 0, 0]}>
          <mesh position={[0, 0.46, 0]} castShadow>
            <boxGeometry args={[width * 0.38, 0.06, 0.06]} />
            <meshStandardMaterial color="#f8fbff" roughness={0.4} />
          </mesh>
          <mesh position={[-width * 0.19, 0.23, 0]} castShadow>
            <boxGeometry args={[0.06, 0.52, 0.06]} />
            <meshStandardMaterial color="#f8fbff" />
          </mesh>
          <mesh position={[width * 0.19, 0.23, 0]} castShadow>
            <boxGeometry args={[0.06, 0.52, 0.06]} />
            <meshStandardMaterial color="#f8fbff" />
          </mesh>
          <mesh position={[0, 0.23, -0.28]}>
            <boxGeometry args={[width * 0.38, 0.46, 0.55]} />
            <meshStandardMaterial color="#dce8ef" wireframe transparent opacity={0.28} />
          </mesh>
        </group>
      ))}

      {showBall && (
        <mesh position={[0, 0.045, 0]} castShadow>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.38} />
        </mesh>
      )}
    </group>
  );
}
