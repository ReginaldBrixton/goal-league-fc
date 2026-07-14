import { useRef, useMemo, lazy } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PlayerModel } from './PlayerModel';
import { Pitch3D } from './Pitch3D';
import type { AnimTag } from './animations';
import type { Player, Team } from '../types';

const ANIM_CYCLE: AnimTag[] = ['idle', 'idle', 'run', 'idle', 'celebrate', 'idle', 'run', 'idle'];

function AnimatedPlayer({
  player,
  team,
  index,
  totalPlayers,
  animIndex,
}: {
  player: Player;
  team: Team;
  index: number;
  totalPlayers: number;
  animIndex: number;
}) {
  const angle = (index / totalPlayers) * Math.PI * 2;
  const radius = 1.8;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const facing = Math.atan2(-x, -z);

  const anim = ANIM_CYCLE[(animIndex + index) % ANIM_CYCLE.length];

  return (
    <PlayerModel
      position={[x, 0, z]}
      rotation={[0, facing, 0]}
      scale={0.7}
      teamId={team.id}
      primaryColor={team.color}
      secondaryColor={team.color2}
      number={index + 1}
      isGK={player.position === 'GK'}
      animation={anim}
    />
  );
}

function OrbitCamera() {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      const radius = 6;
      ref.current.position.x = Math.sin(t * 0.15) * radius;
      ref.current.position.z = Math.cos(t * 0.15) * radius;
      ref.current.position.y = 3.5 + Math.sin(t * 0.1) * 0.3;
      ref.current.lookAt(0, 0.5, 0);
    }
  });
  return null;
}

export interface HubScene3DProps {
  players: Player[];
  team: Team;
  maxPlayers?: number;
}

export function HubScene3D({ players, team, maxPlayers = 8 }: HubScene3DProps) {
  const displayPlayers = useMemo(
    () => players.slice(0, maxPlayers),
    [players, maxPlayers],
  );

  const animIndex = useRef(0);
  useFrame(() => {
    animIndex.current = Math.floor(performance.now() / 3000);
  });

  return (
    <>
      <OrbitCamera />
      <Pitch3D width={5} length={7} />
      <group>
        {displayPlayers.map((player, i) => (
          <AnimatedPlayer
            key={player.id}
            player={player}
            team={team}
            index={i}
            totalPlayers={displayPlayers.length}
            animIndex={animIndex.current}
          />
        ))}
      </group>
    </>
  );
}

export const LazyHubScene3D = lazy(() =>
  Promise.resolve({ default: HubScene3D }),
);
