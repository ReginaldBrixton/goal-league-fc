import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PlayerModel } from './PlayerModel';
import { Pitch3D } from './Pitch3D';
import { formationPositions } from '../data/formations';
import type { FormationKey, Player, Team } from '../types';
import type { AnimTag } from './animations';

export interface TacticsPitch3DProps {
  formation: FormationKey;
  players: Player[];
  team: Team;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function PitchPlayer({
  player,
  team,
  position,
  index,
  selected,
  onSelect,
}: {
  player: Player;
  team: Team;
  position: { x: number; y: number };
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const animRef = useRef<AnimTag>('idle');
  const timerRef = useRef(0);

  const pitchW = 5;
  const pitchL = 7;
  const x = (position.x - 0.5) * pitchW;
  const z = (0.5 - position.y) * pitchL;

  useFrame((_, delta) => {
    timerRef.current += delta;
    if (timerRef.current > 3 + index * 0.5) {
      timerRef.current = 0;
      const anims: AnimTag[] = ['idle', 'run', 'idle', 'idle'];
      if (player.position === 'GK') anims.push('gk_catch');
      else if (player.position === 'DEF') anims.push('tackle');
      else if (player.position === 'MID') anims.push('pass');
      else anims.push('shoot');
      animRef.current = anims[Math.floor(Math.random() * anims.length)];
    }
  });

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      rotation={[0, Math.PI, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(player.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <PlayerModel
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={0.5}
        teamId={team.id}
        primaryColor={team.color}
        secondaryColor={team.color2}
        number={index + 1}
        isGK={player.position === 'GK'}
        animation={selected ? 'celebrate' : 'idle'}
        highlight={selected}
      />
    </group>
  );
}

export function TacticsPitch3D({ formation, players, team, selectedId, onSelect }: TacticsPitch3DProps) {
  const positions = useMemo(() => formationPositions(formation), [formation]);

  return (
    <>
      <Pitch3D width={5} length={7} />
      {players.slice(0, positions.length).map((player, i) => (
        <PitchPlayer
          key={player.id}
          player={player}
          team={team}
          position={positions[i]}
          index={i}
          selected={selectedId === player.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
