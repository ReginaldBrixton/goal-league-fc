import { useState } from 'react';
import { PlayerScene } from './PlayerScene';
import { PlayerModel } from './PlayerModel';
import type { AnimTag } from './animations';
import type { Player, Team } from '../types';

export interface Player3DCardProps {
  player: Player;
  team?: Team | null;
  neutralColor?: string;
  neutralSecondary?: string;
  selected?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
  showAvatar?: boolean;
}

const positionColor: Record<Player['position'], string> = {
  GK: '#f0a500',
  DEF: '#1e88e5',
  MID: '#43a047',
  FWD: '#e53935',
};

const positionAnimation: Record<Player['position'], AnimTag> = {
  GK: 'gk_catch',
  DEF: 'tackle',
  MID: 'pass',
  FWD: 'shoot',
};

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  return `$${Math.round(value / 1_000)}k`;
}

export function Player3DCard({
  player,
  team,
  neutralColor = '#888888',
  neutralSecondary = '#333333',
  selected = false,
  onClick,
  footer,
  showAvatar = true,
}: Player3DCardProps) {
  const [hovered, setHovered] = useState(false);

  const primary = team?.color ?? neutralColor;
  const secondary = team?.color2 ?? neutralSecondary;
  const teamId = team?.id ?? 'free-agent';

  const baseAnim = positionAnimation[player.position];
  const anim: AnimTag = selected ? 'celebrate' : hovered ? baseAnim : 'idle';

  const clickable = Boolean(onClick);
  const developmentRoom = Math.max(0, player.potential - player.rating);

  return (
    <div
      className={`player-card-3d glass-panel-sm${selected ? ' selected' : ''}${clickable ? ' clickable' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={`${player.name}, ${player.position}, overall ${player.rating}`}
      style={{ borderLeftColor: positionColor[player.position] }}
    >
      {showAvatar && (
        <div className="pc3d-avatar">
          <PlayerScene cameraMode="card" frameloop="always">
            <PlayerModel
              position={[0, -0.3, 0]}
              rotation={[0, 0, 0]}
              scale={0.55}
              teamId={teamId}
              primaryColor={primary}
              secondaryColor={secondary}
              number={Number(player.id.replace(/\D/g, '').slice(-3)) || player.rating}
              isGK={player.position === 'GK'}
              animation={anim}
              highlight={selected}
              variant="detail"
            />
          </PlayerScene>
        </div>
      )}

      <div className="pc3d-content">
        <div className="pc3d-head">
          <span className="pc3d-pos" style={{ background: positionColor[player.position] }}>{player.position}</span>
          <span className="pc3d-name" title={player.name}>{player.name}</span>
          <span className="pc3d-ovr">{player.rating}</span>
        </div>

        <div className="pc3d-stats">
          <span title="Pace">PAC {player.pace}</span>
          <span title="Passing">PAS {player.passing}</span>
          <span title="Shooting">SHO {player.shooting}</span>
          <span title="Defending">DEF {player.defending}</span>
        </div>

        <div className="pc3d-meta">
          <span>Age {player.age}</span>
          <span title={`${developmentRoom} overall points of development room`}>
            POT {player.potential}{developmentRoom > 0 ? ` (+${developmentRoom})` : ''}
          </span>
          <span>{formatMoney(player.value)}</span>
        </div>

        {footer && (
          <div className="pc3d-footer" onClick={(event) => event.stopPropagation()}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
