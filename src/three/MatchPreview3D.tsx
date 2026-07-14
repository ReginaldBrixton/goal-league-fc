import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PlayerModel } from './PlayerModel';
import { Pitch3D } from './Pitch3D';
import { formationPositions } from '../data/formations';
import type { Player, Team } from '../types';
import type { AnimTag } from './animations';

export interface MatchPreview3DProps {
  homeTeam: Team;
  awayTeam: Team;
  homeXI: Player[];
  awayXI: Player[];
}

function LineupPlayer({
  player,
  team,
  pos,
  side,
  index,
}: {
  player: Player;
  team: Team;
  pos: { x: number; y: number };
  side: 'home' | 'away';
  index: number;
}) {
  const pitchW = 6;
  const pitchL = 10;

  const x = side === 'home'
    ? (pos.x - 0.5) * pitchW * 0.45
    : -(pos.x - 0.5) * pitchW * 0.45;
  const z = side === 'home'
    ? (0.5 - pos.y) * pitchL * 0.45
    : -(0.5 - pos.y) * pitchL * 0.45;

  const facing = side === 'home' ? 0 : Math.PI;

  const anims: AnimTag[] = ['idle', 'idle', 'run', 'idle'];
  const anim: AnimTag = anims[index % anims.length];

  return (
    <PlayerModel
      position={[x, 0, z]}
      rotation={[0, facing, 0]}
      scale={0.45}
      teamId={team.id}
      primaryColor={team.color}
      secondaryColor={team.color2}
      number={index + 1}
      isGK={player.position === 'GK'}
      animation={anim}
    />
  );
}

function PreviewCamera() {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      const radius = 7;
      ref.current.position.x = Math.sin(t * 0.1) * radius;
      ref.current.position.z = Math.cos(t * 0.1) * radius;
      ref.current.position.y = 4 + Math.sin(t * 0.08) * 0.5;
      ref.current.lookAt(0, 0.5, 0);
    }
  });
  return null;
}

export function MatchPreview3D({ homeTeam, awayTeam, homeXI, awayXI }: MatchPreview3DProps) {
  const positions = useMemo(() => formationPositions('4-3-3'), []);

  return (
    <>
      <PreviewCamera />
      <Pitch3D width={6} length={10} />
      <group>
        {homeXI.slice(0, 11).map((player, i) => (
          <LineupPlayer
            key={`home-${player.id}`}
            player={player}
            team={homeTeam}
            pos={positions[i] ?? { x: 0.5, y: 0.5 }}
            side="home"
            index={i}
          />
        ))}
      </group>
      <group>
        {awayXI.slice(0, 11).map((player, i) => (
          <LineupPlayer
            key={`away-${player.id}`}
            player={player}
            team={awayTeam}
            pos={positions[i] ?? { x: 0.5, y: 0.5 }}
            side="away"
            index={i}
          />
        ))}
      </group>
    </>
  );
}
