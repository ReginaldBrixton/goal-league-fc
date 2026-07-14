import { useMemo, useState, Suspense } from 'react';
import type { ChangeEvent } from 'react';
import { useGame } from '../store/gameStore';
import { Player3DCard } from '../three/Player3DCard';
import { PlayerScene } from '../three/PlayerScene';
import { PlayerModel } from '../three/PlayerModel';
import type { Player } from '../types';
import './TransferMarket.css';

type Tab = 'market' | 'squad';
type SortKey = 'rating' | 'value' | 'age' | 'potential';
type SortDirection = 'asc' | 'desc';

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  return `$${Math.round(value / 1_000)}k`;
}

export function TransferMarket() {
  const userTeam = useGame((state) => state.userTeam);
  const freeAgents = useGame((state) => state.freeAgents);
  const players = useGame((state) => state.players);
  const buyPlayer = useGame((state) => state.buyPlayer);
  const sellPlayer = useGame((state) => state.sellPlayer);
  const pushLog = useGame((state) => state.pushLog);

  const [tab, setTab] = useState<Tab>('market');
  const [position, setPosition] = useState<Player['position'] | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [query, setQuery] = useState('');

  const squad = useMemo(
    () => players.filter((player) => player.teamId === userTeam?.id).sort((a, b) => b.rating - a.rating),
    [players, userTeam?.id],
  );

  const list = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = tab === 'market' ? freeAgents : squad;
    const direction = sortDirection === 'desc' ? -1 : 1;

    return source
      .filter((player) => position === 'ALL' || player.position === position)
      .filter((player) => !normalizedQuery || player.name.toLowerCase().includes(normalizedQuery))
      .slice()
      .sort((a, b) => {
        const primary = (a[sortKey] - b[sortKey]) * direction;
        return primary || b.rating - a.rating || a.name.localeCompare(b.name);
      });
  }, [freeAgents, position, query, sortDirection, sortKey, squad, tab]);

  const featured = useMemo(
    () => [...freeAgents].sort((a, b) => b.rating - a.rating)[0] ?? null,
    [freeAgents],
  );

  if (!userTeam) return null;

  const positionCount = (pos: Player['position']) => squad.filter((player) => player.position === pos).length;
  const salePrice = (player: Player) => Math.round(player.value * 0.9);
  const canSell = (player: Player): { allowed: boolean; reason?: string } => {
    if (squad.length <= 14) return { allowed: false, reason: 'A minimum squad of 14 players is required.' };
    const minimumByPosition: Record<Player['position'], number> = { GK: 1, DEF: 3, MID: 2, FWD: 1 };
    if (positionCount(player.position) <= minimumByPosition[player.position]) {
      return { allowed: false, reason: `You need at least ${minimumByPosition[player.position]} ${player.position} player(s).` };
    }
    return { allowed: true };
  };

  const onBuy = (player: Player) => {
    if (squad.some((member) => member.id === player.id)) {
      pushLog(`${player.name} is already in your squad.`);
      return;
    }
    if (userTeam.budget < player.value) {
      pushLog(`Not enough budget for ${player.name} (${formatMoney(player.value)}).`);
      return;
    }
    buyPlayer(player.id);
  };

  const onSell = (player: Player) => {
    const eligibility = canSell(player);
    if (!eligibility.allowed) {
      pushLog(`Cannot sell ${player.name}: ${eligibility.reason}`);
      return;
    }
    sellPlayer(player.id);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((current) => current === 'desc' ? 'asc' : 'desc');
    else {
      setSortKey(key);
      setSortDirection(key === 'age' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="transfers">
      <section className="panel">
        <div className="transfers-head">
          <h2>Transfer Market</h2>
          <span className="budget-pill">Budget {formatMoney(userTeam.budget)}</span>
        </div>

        <div className="tabs" role="tablist" aria-label="Transfer views">
          <button type="button" role="tab" aria-selected={tab === 'market'} className={`chip${tab === 'market' ? ' active' : ''}`} onClick={() => setTab('market')}>
            Free Agents ({freeAgents.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'squad'} className={`chip${tab === 'squad' ? ' active' : ''}`} onClick={() => setTab('squad')}>
            My Squad ({squad.length})
          </button>
        </div>

        <div className="filters">
          <label>
            Search:
            <input type="search" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Player name" />
          </label>
          <span>Position:</span>
          {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((item) => (
            <button type="button" key={item} className={`chip${position === item ? ' active' : ''}`} onClick={() => setPosition(item)} aria-pressed={position === item}>
              {item}
            </button>
          ))}
        </div>

        <div className="filters">
          <span>Sort:</span>
          {(['rating', 'potential', 'value', 'age'] as const).map((key) => (
            <button type="button" key={key} className={`chip${sortKey === key ? ' active' : ''}`} onClick={() => toggleSort(key)}>
              {key}{sortKey === key ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}
            </button>
          ))}
        </div>
      </section>

      {tab === 'market' && featured && (
        <div className="featured-spotlight glass-panel">
          <div className="featured-scene">
            <Suspense fallback={<div className="featured-fallback" />}>
              <PlayerScene cameraMode="card" frameloop="always">
                <PlayerModel
                  position={[0, -0.3, 0]}
                  scale={0.7}
                  teamId="free-agent"
                  primaryColor="#e8eef5"
                  secondaryColor="#1a1a1a"
                  number={featured.rating}
                  isGK={featured.position === 'GK'}
                  animation="dribble"
                />
              </PlayerScene>
            </Suspense>
          </div>
          <div className="featured-info">
            <span className="featured-label">Top Free Agent</span>
            <h3 className="featured-name">{featured.name}</h3>
            <div className="featured-stats">
              <span className="glass-chip accent">OVR {featured.rating}</span>
              <span className="glass-chip">{featured.position}</span>
              <span className="glass-chip">Age {featured.age}</span>
              <span className="glass-chip gold">{formatMoney(featured.value)}</span>
            </div>
            <button
              type="button"
              className="btn primary"
              disabled={userTeam.budget < featured.value}
              onClick={() => onBuy(featured)}
            >
              Sign {formatMoney(featured.value)}
            </button>
          </div>
        </div>
      )}

      <div className="card-grid">
        {list.map((player) => {
          const sellState = canSell(player);
          const playerTeam = tab === 'squad' ? userTeam : null;
          return (
            <Player3DCard
              key={player.id}
              player={player}
              team={playerTeam}
              selected={false}
              footer={tab === 'market' ? (
                <button
                  type="button"
                  className="btn small"
                  disabled={userTeam.budget < player.value || squad.some((member) => member.id === player.id)}
                  onClick={() => onBuy(player)}
                >
                  Buy {formatMoney(player.value)}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn small danger"
                  disabled={!sellState.allowed}
                  title={sellState.reason}
                  onClick={() => onSell(player)}
                >
                  Sell {formatMoney(salePrice(player))}
                </button>
              )}
            />
          );
        })}
      </div>

      {list.length === 0 && <div className="panel"><p className="muted">No players match the current filters.</p></div>}
    </div>
  );
}