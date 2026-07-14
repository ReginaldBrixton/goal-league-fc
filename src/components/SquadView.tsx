import { useMemo, useState, Suspense } from 'react';
import { useGame } from '../store/gameStore';
import { FORMATION_LIST, formationPositions } from '../data/formations';
import type { FormationKey, Player } from '../types';
import { Player3DCard } from '../three/Player3DCard';
import { PlayerScene } from '../three/PlayerScene';
import { TacticsPitch3D } from '../three/TacticsPitch3D';
import './SquadView.css';

function parseFormation(formation: FormationKey): { defenders: number; midfielders: number; forwards: number } {
  const [defenders, midfielders, forwards] = String(formation).split('-').map(Number);
  return {
    defenders: Number.isFinite(defenders) ? defenders : 4,
    midfielders: Number.isFinite(midfielders) ? midfielders : 3,
    forwards: Number.isFinite(forwards) ? forwards : 3,
  };
}

function roleScore(player: Player, requested: Player['position']): number {
  const naturalBonus = player.position === requested ? 30 : 0;
  const versatility = requested === 'DEF'
    ? player.defending * 0.4 + player.pace * 0.15
    : requested === 'MID'
      ? player.passing * 0.4 + player.pace * 0.1
      : requested === 'FWD'
        ? player.shooting * 0.45 + player.pace * 0.15
        : player.defending * 0.45 + player.passing * 0.1;
  return player.rating + naturalBonus + versatility;
}

/** Returns players in exact formation-slot order: GK, defenders, midfielders, forwards. */
export function pickXI(squad: Player[], formation: FormationKey): Player[] {
  const shape = parseFormation(formation);
  const requested = ([
    'GK',
    ...Array.from({ length: shape.defenders }, (): Player['position'] => 'DEF'),
    ...Array.from({ length: shape.midfielders }, (): Player['position'] => 'MID'),
    ...Array.from({ length: shape.forwards }, (): Player['position'] => 'FWD'),
  ] as Player['position'][]).slice(0, 11);

  const unique = [...new Map(squad.map((player) => [player.id, player])).values()];
  const used = new Set<string>();
  const selected: Player[] = [];

  for (const requestedPosition of requested) {
    const available = unique.filter((player) => !used.has(player.id));
    if (available.length === 0) break;
    const natural = available.filter((player) => player.position === requestedPosition);
    const pool = natural.length > 0 ? natural : available;
    const player = pool.sort((a, b) => roleScore(b, requestedPosition) - roleScore(a, requestedPosition))[0];
    selected.push(player);
    used.add(player.id);
  }

  return selected;
}

export function SquadView() {
  const userTeam = useGame((state) => state.userTeam);
  const players = useGame((state) => state.players);
  const [formation, setFormation] = useState<FormationKey>('4-3-3');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const squad = useMemo(
    () => players.filter((player) => player.teamId === userTeam?.id).sort((a, b) => b.rating - a.rating),
    [players, userTeam?.id],
  );
  const xi = useMemo(() => pickXI(squad, formation), [formation, squad]);
  const xiIds = useMemo(() => new Set(xi.map((player) => player.id)), [xi]);
  const bench = useMemo(() => squad.filter((player) => !xiIds.has(player.id)), [squad, xiIds]);
  const selectedPlayer = squad.find((player) => player.id === selectedId) ?? null;
  const shape = parseFormation(formation);
  const slotPositions = [
    'GK',
    ...Array.from({ length: shape.defenders }, (): Player['position'] => 'DEF'),
    ...Array.from({ length: shape.midfielders }, (): Player['position'] => 'MID'),
    ...Array.from({ length: shape.forwards }, (): Player['position'] => 'FWD'),
  ] as Player['position'][];

  if (!userTeam) return null;

  return (
    <div className="squad">
      <section className="panel">
        <h2>Squad &amp; Tactics — {userTeam.name}</h2>
        <div className="formation-picker">
          <span>Formation:</span>
          {FORMATION_LIST.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`chip${formation === item.key ? ' active' : ''}`}
              onClick={() => setFormation(item.key)}
              aria-pressed={formation === item.key}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="pitch-tactic-3d" aria-label={`${formation} tactical lineup`}>
          <Suspense fallback={<div className="pitch-tactic-fallback" />}>
            <PlayerScene cameraMode="topdown" shadows>
              <TacticsPitch3D
                formation={formation}
                players={xi}
                team={userTeam}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </PlayerScene>
          </Suspense>
        </div>
        <div className="pitch-tactic-legend">
          {formationPositions(formation).map((_position, index) => {
            const player = xi[index];
            const requestedPosition = slotPositions[index];
            const outOfPosition = Boolean(player && requestedPosition && player.position !== requestedPosition);
            return (
              <button
                type="button"
                key={`${requestedPosition ?? 'slot'}-${index}`}
                className={`tactic-chip${outOfPosition ? ' out-of-position' : ''}`}
                title={player ? `${player.name} (${player.rating})${outOfPosition ? ` — filling ${requestedPosition}` : ''}` : `Empty ${requestedPosition ?? ''} slot`}
                onClick={() => player && setSelectedId(player.id)}
                disabled={!player}
              >
                <span className="tc-num">{player?.rating ?? '-'}</span>
                <span className="tc-pos">{player?.position ?? requestedPosition ?? ''}</span>
              </button>
            );
          })}
        </div>
        <p className="muted">
          The lineup fills every tactical slot in order and only uses an out-of-position player when no natural option remains.
        </p>
      </section>

      <div className="squad-cols">
        <section className="panel">
          <h3>Starting XI ({xi.length}/11)</h3>
          <div className="card-grid">
            {xi.map((player) => (
              <Player3DCard key={player.id} player={player} team={userTeam} selected={selectedId === player.id} onClick={() => setSelectedId(player.id)} />
            ))}
          </div>
          {xi.length < 11 && <p className="muted">The squad does not contain enough available players for a full XI.</p>}
        </section>

        <section className="panel">
          <h3>Bench / Reserves ({bench.length})</h3>
          <div className="card-grid">
            {bench.map((player) => (
              <Player3DCard key={player.id} player={player} team={userTeam} selected={selectedId === player.id} onClick={() => setSelectedId(player.id)} />
            ))}
            {bench.length === 0 && <p className="muted">No reserves.</p>}
          </div>
        </section>
      </div>

      {selectedPlayer && (
        <section className="panel detail" aria-live="polite">
          <h3>{selectedPlayer.name}</h3>
          <div className="detail-grid">
            <span>Position: <b>{selectedPlayer.position}</b></span>
            <span>Age: <b>{selectedPlayer.age}</b></span>
            <span>Overall: <b>{selectedPlayer.rating}</b></span>
            <span>Potential: <b>{selectedPlayer.potential}</b></span>
            <span>Pace: <b>{selectedPlayer.pace}</b></span>
            <span>Passing: <b>{selectedPlayer.passing}</b></span>
            <span>Shooting: <b>{selectedPlayer.shooting}</b></span>
            <span>Defending: <b>{selectedPlayer.defending}</b></span>
            <span>Value: <b>${(selectedPlayer.value / 1_000).toFixed(0)}k</b></span>
            <span>Wage: <b>${selectedPlayer.wage.toLocaleString()}/m</b></span>
            <span>Season goals: <b>{selectedPlayer.goals}</b></span>
            <span>Appearances: <b>{selectedPlayer.apps}</b></span>
          </div>
          <button type="button" className="btn" onClick={() => setSelectedId(null)}>Close</button>
        </section>
      )}
    </div>
  );
}

export { bestXI } from '../engine/simEngine';