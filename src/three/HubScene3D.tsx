import { useRef, useMemo, lazy } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
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

  const animation = ANIM_CYCLE[(animIndex + index) % ANIM_CYCLE.length];

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
      animation={animation}
    />
  );
}

function OrbitCamera() {
  const { camera, size } = useThree();
  const focus = useMemo(() => new THREE.Vector3(0, 0.42, 0), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const narrow = size.width < 620;
    const radius = narrow ? 7.4 : 6.2;
    camera.position.x = Math.sin(time * 0.13) * radius;
    camera.position.z = Math.cos(time * 0.13) * radius;
    camera.position.y = narrow ? 4.7 : 3.8 + Math.sin(time * 0.1) * 0.25;
    camera.lookAt(focus);
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
        {displayPlayers.map((player, index) => (
          <AnimatedPlayer
            key={player.id}
            player={player}
            team={team}
            index={index}
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
