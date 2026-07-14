import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { Player } from '../types';
import './PlayerCard.css';

const positionColor: Record<Player['position'], string> = {
  GK: '#f0a500',
  DEF: '#1e88e5',
  MID: '#43a047',
  FWD: '#e53935',
};

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  return `$${Math.round(value / 1_000)}k`;
}

export function PlayerCard({
  p,
  onClick,
  selected = false,
  footer,
}: {
  p: Player;
  onClick?: () => void;
  selected?: boolean;
  footer?: ReactNode;
}) {
  const clickable = Boolean(onClick);
  const developmentRoom = Math.max(0, p.potential - p.rating);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!clickable || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick?.();
  };

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}${clickable ? ' clickable' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? selected : undefined}
      aria-label={`${p.name}, ${p.position}, overall ${p.rating}, potential ${p.potential}`}
      style={{ borderLeftColor: positionColor[p.position] }}
    >
      <div className="pc-head">
        <span className="pc-pos" style={{ background: positionColor[p.position] }}>{p.position}</span>
        <span className="pc-name" title={p.name}>{p.name}</span>
        <span className="pc-ovr" title="Overall rating">{p.rating}</span>
      </div>

      <div className="pc-stats" aria-label="Player attributes">
        <span title="Pace">PAC {p.pace}</span>
        <span title="Passing">PAS {p.passing}</span>
        <span title="Shooting">SHO {p.shooting}</span>
        <span title="Defending">DEF {p.defending}</span>
      </div>

      <div className="pc-meta">
        <span>Age {p.age}</span>
        <span title={`${developmentRoom} overall points of development room`}>
          POT {p.potential}{developmentRoom > 0 ? ` (+${developmentRoom})` : ''}
        </span>
        <span>{formatMoney(p.value)}</span>
      </div>

      {footer && (
        <div className="pc-footer" onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
          {footer}
        </div>
      )}
    </div>
  );
}