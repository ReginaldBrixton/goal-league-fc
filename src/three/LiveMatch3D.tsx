import { useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MatchResult, Team } from '../types';
import {
  MatchEngine,
  type Entity,
  type InputState,
  type Vec,
} from '../engine/matchEngine';
import { mapScreenInputToPitch, type CameraControlBasis } from '../input/cameraRelativeInput';
import type { MatchCamera, MatchGraphics } from '../utils/matchSettings';
import { PlayerScene } from './PlayerScene';
import { Pitch3D } from './Pitch3D';
import { PlayerModel } from './PlayerModel';
import type { AnimTag } from './animations';
import { getMatchCameraPose } from './matchCamera';
import {
  isCompactMatchViewport,
  LIVE_PLAYER_SCALE,
  MATCH_MAX_DPR,
} from './playerPresentation';

interface EngineInternals {
  entities: Entity[];
  ball: Vec;
  carrier: Entity | null;
  activeUserId: string | null;
}

export interface LiveMatch3DProps {
  engine: MatchEngine;
  inputRef: MutableRefObject<InputState>;
  paused: boolean;
  cameraMode: MatchCamera;
  graphics: MatchGraphics;
  home: Team;
  away: Team;
  onFinished: (result: MatchResult) => void;
}

function readEngine(engine: MatchEngine): EngineInternals {
  return engine as unknown as EngineInternals;
}

function pitchPosition(position: Vec): [number, number, number] {
  return [
    (position.y / 68 - 0.5) * 6,
    0.025,
    (position.x / 105 - 0.5) * 10,
  ];
}

function stableSkin(playerId: string): string {
  const hash = [...playerId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ['#5a382b', '#7b4d38', '#a66f50', '#cf9871', '#e1b18a'][hash % 5];
}

function playerNumber(entity: Entity, index: number): number {
  const numeric = Number(entity.player.id.replace(/\D/g, '').slice(-2));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : (index % 30) + 1;
}

function LivePlayer({
  engine,
  entity,
  index,
  home,
  away,
  compact,
  shadows,
}: {
  engine: MatchEngine;
  entity: Entity;
  index: number;
  home: Team;
  away: Team;
  compact: boolean;
  shadows: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [animation, setAnimation] = useState<AnimTag>('idle');
  const [isActive, setIsActive] = useState(false);
  const lastAnimation = useRef<AnimTag>('idle');
  const lastActive = useRef(false);
  const team = entity.side === 'home' ? home : away;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const target = pitchPosition(entity.pos);
    group.position.set(target[0], target[1], target[2]);
    const speed = Math.hypot(entity.vel.x, entity.vel.y);
    if (speed > 0.05) {
      group.rotation.y = Math.atan2(entity.vel.x, entity.vel.y);
    } else {
      group.rotation.y = Math.atan2(entity.facing.x, entity.facing.y);
    }

    const internals = readEngine(engine);
    let nextAnimation: AnimTag = 'idle';
    if (entity.sliding > 0) nextAnimation = 'tackle';
    else if (internals.carrier === entity) nextAnimation = speed > 0.8 ? 'dribble' : 'idle';
    else if (speed > 7.4) nextAnimation = 'sprint';
    else if (speed > 0.35) nextAnimation = 'run';

    if (nextAnimation !== lastAnimation.current) {
      lastAnimation.current = nextAnimation;
      setAnimation(nextAnimation);
    }

    const nextActive = internals.activeUserId === entity.id;
    if (nextActive !== lastActive.current) {
      lastActive.current = nextActive;
      setIsActive(nextActive);
    }
  });

  return (
    <group ref={groupRef}>
      <PlayerModel
        scale={LIVE_PLAYER_SCALE}
        teamId={team.id}
        primaryColor={team.color}
        secondaryColor={team.color2}
        number={playerNumber(entity, index)}
        isGK={entity.isGk}
        animation={animation}
        skinColor={stableSkin(entity.player.id)}
        highlight={isActive}
        variant="match"
        shadows={shadows && !compact}
      />
    </group>
  );
}

function LiveBall({ engine }: { engine: MatchEngine }) {
  const ballRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const ball = ballRef.current;
    if (!ball) return;
    const internals = readEngine(engine);
    const target = pitchPosition(internals.ball);
    ball.position.set(target[0], 0.105, target[2]);
    ball.rotation.x += delta * 4.4;
    ball.rotation.z += delta * 3.1;
  });

  return (
    <mesh ref={ballRef} castShadow>
      <sphereGeometry args={[0.072, 16, 16]} />
      <meshStandardMaterial color="#f8fbff" roughness={0.48} metalness={0.04} />
    </mesh>
  );
}

function EngineDriver({
  engine,
  inputRef,
  paused,
  onFinished,
  controlBasisRef,
}: Pick<LiveMatch3DProps, 'engine' | 'inputRef' | 'paused' | 'onFinished'> & {
  controlBasisRef: MutableRefObject<CameraControlBasis>;
}) {
  const completed = useRef(false);

  useFrame((_, delta) => {
    if (!paused && !completed.current) {
      const rawInput = inputRef.current;
      const mapped = mapScreenInputToPitch(rawInput, controlBasisRef.current);
      engine.setInput({
        ...rawInput,
        up: mapped.y < -0.2,
        down: mapped.y > 0.2,
        left: mapped.x < -0.2,
        right: mapped.x > 0.2,
      });
      engine.update(Math.min(0.05, delta));
    }

    if (!completed.current && engine.getHud().finished) {
      completed.current = true;
      onFinished(engine.getResult());
    }
  }, -20);

  return null;
}

function MatchCameraRig({
  engine,
  cameraMode,
  controlBasisRef,
}: {
  engine: MatchEngine;
  cameraMode: MatchCamera;
  controlBasisRef: MutableRefObject<CameraControlBasis>;
}) {
  const { camera, size } = useThree();
  const lookAt = useRef(new THREE.Vector3());
  const targetPosition = useRef(new THREE.Vector3());
  const cameraRight = useRef(new THREE.Vector3());
  const cameraUp = useRef(new THREE.Vector3());

  useFrame(() => {
    const internals = readEngine(engine);
    const focusEntity = internals.entities.find((entity) => entity.id === internals.activeUserId);
    const focus = focusEntity?.pos ?? internals.ball;
    const world = pitchPosition(focus);
    const pose = getMatchCameraPose(cameraMode, size.width / Math.max(1, size.height), {
      x: world[0],
      y: world[1],
      z: world[2],
    });

    targetPosition.current.set(pose.position.x, pose.position.y, pose.position.z);
    lookAt.current.set(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
    camera.position.lerp(targetPosition.current, pose.lerp);
    camera.lookAt(lookAt.current);

    cameraRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraUp.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
    cameraRight.current.y = 0;
    cameraUp.current.y = 0;
    if (cameraRight.current.lengthSq() > 0.0001) cameraRight.current.normalize();
    if (cameraUp.current.lengthSq() > 0.0001) cameraUp.current.normalize();

    controlBasisRef.current = {
      screenRight: {
        x: cameraRight.current.z * 10.5,
        y: cameraRight.current.x * (68 / 6),
      },
      screenUp: {
        x: cameraUp.current.z * 10.5,
        y: cameraUp.current.x * (68 / 6),
      },
    };
  }, -30);

  return null;
}

function Stadium({ graphics, compact }: { graphics: MatchGraphics; compact: boolean }) {
  const requestedRows = graphics === 'battery' ? 2 : graphics === 'ultra' ? 6 : 4;
  const crowdRows = compact ? Math.min(2, requestedRows) : requestedRows;
  const rows = useMemo(() => Array.from({ length: crowdRows }, (_, index) => index), [crowdRows]);

  return (
    <group>
      {rows.map((row) => (
        <group key={row} position={[0, 0.22 + row * 0.22, 0]}>
          <mesh position={[-3.55 - row * 0.08, 0, 0]}>
            <boxGeometry args={[0.42, 0.2, 11.2 + row * 0.2]} />
            <meshStandardMaterial color={row % 2 ? '#142030' : '#1b2b3d'} roughness={0.78} />
          </mesh>
          <mesh position={[3.55 + row * 0.08, 0, 0]}>
            <boxGeometry args={[0.42, 0.2, 11.2 + row * 0.2]} />
            <meshStandardMaterial color={row % 2 ? '#142030' : '#1b2b3d'} roughness={0.78} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[8.6, 0.14, 12.4]} />
        <meshStandardMaterial color="#071019" roughness={0.92} />
      </mesh>
      {!compact && [-1, 1].flatMap((side) => [-1, 1].map((end) => (
        <group key={`${side}-${end}`} position={[side * 4.1, 2.5, end * 4.7]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.075, 5, 10]} />
            <meshStandardMaterial color="#485a70" metalness={0.8} roughness={0.24} />
          </mesh>
          <spotLight
            position={[0, 2.3, 0]}
            angle={0.52}
            penumbra={0.72}
            intensity={graphics === 'battery' ? 0.7 : 2.2}
            color="#e9f7ff"
          />
        </group>
      )))}
    </group>
  );
}

function LiveScene(props: LiveMatch3DProps) {
  const entities = useMemo(() => readEngine(props.engine).entities, [props.engine]);
  const { size } = useThree();
  const compact = isCompactMatchViewport(size.width, size.height);
  const renderShadows = !compact && props.graphics !== 'battery';
  const controlBasisRef = useRef<CameraControlBasis>({
    screenRight: { x: 1, y: 0 },
    screenUp: { x: 0, y: -1 },
  });

  return (
    <>
      <fog attach="fog" args={['#071019', compact ? 16 : 12, compact ? 30 : 24]} />
      <EngineDriver
        engine={props.engine}
        inputRef={props.inputRef}
        paused={props.paused}
        onFinished={props.onFinished}
        controlBasisRef={controlBasisRef}
      />
      <MatchCameraRig engine={props.engine} cameraMode={props.cameraMode} controlBasisRef={controlBasisRef} />
      <Stadium graphics={props.graphics} compact={compact} />
      <Pitch3D width={6} length={10} showBall={false} />
      {entities.map((entity, index) => (
        <LivePlayer
          key={entity.id}
          engine={props.engine}
          entity={entity}
          index={index}
          home={props.home}
          away={props.away}
          compact={compact}
          shadows={renderShadows}
        />
      ))}
      <LiveBall engine={props.engine} />
      <hemisphereLight intensity={compact ? 1 : 0.75} color="#e7f7ff" groundColor="#09110c" />
      <directionalLight
        position={[4, 9, 3]}
        intensity={props.graphics === 'battery' ? 0.9 : compact ? 1.25 : 1.75}
        castShadow={renderShadows}
        shadow-mapSize={props.graphics === 'ultra' ? 1536 : 768}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
    </>
  );
}

export function LiveMatch3D(props: LiveMatch3DProps) {
  const cameraPosition: [number, number, number] = props.cameraMode === 'tactical'
    ? [0, 9.6, 0.05]
    : props.cameraMode === 'dynamic'
      ? [4.1, 3.1, -4.7]
      : [5.5, 4.2, 1.8];

  return (
    <PlayerScene
      cameraMode="broadcast"
      cameraPosition={cameraPosition}
      fov={props.cameraMode === 'tactical' ? 45 : 48}
      shadows={props.graphics !== 'battery'}
      className="live-match-canvas"
      maxDpr={MATCH_MAX_DPR}
    >
      <LiveScene {...props} />
    </PlayerScene>
  );
}
