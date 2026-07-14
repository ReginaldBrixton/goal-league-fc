import { useMemo } from 'react';
import * as THREE from 'three';

export interface Pitch3DProps {
  width?: number;
  length?: number;
  rotateY?: number;
}

function createLineMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
}

function makeLine(points: [number, number, number][]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array(points.flat());
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  return geo;
}

export function Pitch3D({ width = 6, length = 10, rotateY = 0 }: Pitch3DProps) {
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const baseGreen = '#2d5a2d';
    const stripeGreen = '#265226';
    ctx.fillStyle = baseGreen;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = stripeGreen;
    for (let i = 0; i < 512; i += 64) {
      ctx.fillRect(i, 0, 32, 512);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 5);
    return tex;
  }, []);

  const lineMat = useMemo(() => createLineMaterial(), []);

  const hw = width / 2;
  const hl = length / 2;
  const lineY = 0.02;

  const lines = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];

    geos.push(makeLine([[-hw, lineY, -hl], [hw, lineY, -hl], [hw, lineY, hl], [-hw, lineY, hl], [-hw, lineY, -hl]]));

    geos.push(makeLine([[-hw, lineY, 0], [hw, lineY, 0]]));

    const centerGeo = new THREE.RingGeometry(0.6, 0.63, 32);
    centerGeo.rotateX(-Math.PI / 2);
    centerGeo.translate(0, lineY, 0);
    geos.push(centerGeo);

    const boxW = width * 0.6;
    const boxL = 1.2;
    geos.push(makeLine([[-boxW / 2, lineY, -hl], [boxW / 2, lineY, -hl], [boxW / 2, lineY, -hl + boxL], [-boxW / 2, lineY, -hl + boxL], [-boxW / 2, lineY, -hl]]));
    geos.push(makeLine([[boxW / 2, lineY, hl], [-boxW / 2, lineY, hl], [-boxW / 2, lineY, hl - boxL], [boxW / 2, lineY, hl - boxL], [boxW / 2, lineY, hl]]));

    const smBoxW = width * 0.3;
    const smBoxL = 0.5;
    geos.push(makeLine([[-smBoxW / 2, lineY, -hl], [smBoxW / 2, lineY, -hl], [smBoxW / 2, lineY, -hl + smBoxL], [-smBoxW / 2, lineY, -hl + smBoxL], [-smBoxW / 2, lineY, -hl]]));
    geos.push(makeLine([[smBoxW / 2, lineY, hl], [-smBoxW / 2, lineY, hl], [-smBoxW / 2, lineY, hl - smBoxL], [smBoxW / 2, lineY, hl - smBoxL], [smBoxW / 2, lineY, hl]]));

    return geos;
  }, [hw, hl, lineY]);

  return (
    <group rotation={[0, rotateY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial map={grassTexture} roughness={0.8} />
      </mesh>

      {lines.map((geo, i) => {
        const lineObj = new THREE.Line(geo, lineMat);
        return <primitive key={i} object={lineObj} />;
      })}

      <mesh position={[0, 0.05, -hl - 0.05]}>
        <boxGeometry args={[width * 0.4, 0.15, 0.08]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.05, hl + 0.05]}>
        <boxGeometry args={[width * 0.4, 0.15, 0.08]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
    </group>
  );
}
