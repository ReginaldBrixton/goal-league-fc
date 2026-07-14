import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useGame } from '../store/gameStore';
import { PlayerCard } from './PlayerCard';
import type { Player, TrainingFocus } from '../types';
import './TrainingView.css';

const FOCUSES: { key: TrainingFocus; label: string; desc: string }[] = [
  { key: 'balanced', label: 'Balanced', desc: 'Spread development across all attributes' },
  { key: 'attacking', label: 'Attacking', desc: 'Prioritise shooting, passing and pace' },
  { key: 'defending', label: 'Defending', desc: 'Prioritise defending, pace and passing' },
  { key: 'fitness', label: 'Fitness', desc: 'Prioritise pace and physical readiness' },
];

export function TrainingView() {
  const userTeam = useGame((state) => state.userTeam);
  const players = useGame((state) => state.players);
  const train = useGame((state) => state.train);
  const trainingFocus = useGame((state) => state.trainingFocus);
  const setTrainingFocus = useGame((state) => state.setTrainingFocus);
  const [position, setPosition] = useState<Player['position'] | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const squad = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return players
      .filter((player) => player.teamId === userTeam?.id)
      .filter((player) => position === 'ALL' || player.position === position)
      .filter((player) => !normalizedQuery || player.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const gapDifference = (b.potential - b.rating) - (a.potential - a.rating);
        return gapDifference || a.age - b.age || b.rating - a.rating;
      });
  }, [players, position, query, userTeam?.id]);

  if (!userTeam) return null;

  const applyFocusToVisible = (focus: TrainingFocus) => {
    for (const player of squad) setTrainingFocus(player.id, focus);
  };

  return (
    <div className="training">
      <section className="panel">
        <h2>Training — {userTeam.name}</h2>
        <p className="muted">
          Development is constrained by age and potential. Younger players improve more quickly, while every accepted attribute gain must remain inside the player's potential ceiling.
        </p>

        <div className="filters training-filters">
          <label>
            Search:
            <input
              type="search"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Player name"
            />
          </label>
          <span>Position:</span>
          {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={`chip${position === item ? ' active' : ''}`}
              onClick={() => setPosition(item)}
              aria-pressed={position === item}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="filters">
          <span>Set visible players:</span>
          {FOCUSES.map((focus) => (
            <button type="button" key={focus.key} className="chip" onClick={() => applyFocusToVisible(focus.key)}>
              {focus.label}
            </button>
          ))}
        </div>
      </section>

      <div className="card-grid">
        {squad.map((player) => {
          const focus = trainingFocus[player.id] ?? 'balanced';
          const canGrow = player.rating < player.potential;
          return (
            <PlayerCard
              key={player.id}
              p={player}
              footer={
                <div className="train-footer">
                  <div className="focus-row" aria-label={`Training focus for ${player.name}`}>
                    {FOCUSES.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        className={`chip tiny${focus === item.key ? ' active' : ''}`}
                        title={item.desc}
                        aria-pressed={focus === item.key}
                        onClick={() => setTrainingFocus(player.id, item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn small primary"
                    disabled={!canGrow}
                    onClick={() => train(player.id)}
                  >
                    {canGrow ? `Train ${focus}` : 'At potential'}
                  </button>
                </div>
              }
            />
          );
        })}
      </div>

      {squad.length === 0 && <div className="panel"><p className="muted">No players match the current filters.</p></div>}
    </div>
  );
}