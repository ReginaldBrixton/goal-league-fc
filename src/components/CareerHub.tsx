import { useMemo, Suspense, useState, useEffect } from 'react';
import { useGame } from '../store/gameStore';
import { LeagueTable } from './LeagueTable';
import { PlayerScene } from '../three/PlayerScene';
import { HubScene3D } from '../three/HubScene3D';
import './CareerHub.css';
import './CareerHubNative.css';

function formatBudget(value: number): string {
  return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${Math.round(value / 1_000)}k`;
}

function HubSceneFallback() {
  return (
    <div className="hub-hero-skeleton">
      <div className="hub-hero-skeleton-inner" />
    </div>
  );
}

export function CareerHub() {
  const userTeam = useGame((state) => state.userTeam);
  const nextFixture = useGame((state) => state.nextFixture);
  const teams = useGame((state) => state.teams);
  const setView = useGame((state) => state.setView);
  const advanceSeason = useGame((state) => state.advanceSeason);
  const round = useGame((state) => state.round);
  const season = useGame((state) => state.season);
  const log = useGame((state) => state.log);
  const fixtures = useGame((state) => state.fixtures);
  const userTeamId = useGame((state) => state.userTeamId);
  const table = useGame((state) => state.table);
  const players = useGame((state) => state.players);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const recent = useMemo(
    () => fixtures
      .filter((fixture) => fixture.played && (fixture.homeId === userTeamId || fixture.awayId === userTeamId))
      .slice(-5)
      .reverse(),
    [fixtures, userTeamId],
  );
  const leaguePosition = useMemo(
    () => table.findIndex((row) => row.teamId === userTeamId) + 1,
    [table, userTeamId],
  );
  const recentNews = useMemo(() => [...log].slice(-8).reverse(), [log]);
  const squadPlayers = useMemo(
    () => players.filter((player) => player.teamId === userTeam?.id).sort((a, b) => b.rating - a.rating).slice(0, 8),
    [players, userTeam?.id],
  );

  if (!userTeam) return null;

  const home = nextFixture ? teamById.get(nextFixture.homeId) : undefined;
  const away = nextFixture ? teamById.get(nextFixture.awayId) : undefined;
  const isHome = nextFixture?.homeId === userTeam.id;
  const opponent = isHome ? away : home;

  const positionSuffix = (position: number) => {
    if (position === 1) return 'st';
    if (position === 2) return 'nd';
    if (position === 3) return 'rd';
    return 'th';
  };

  return (
    <div className="hub">
      <section className="hub-hero">
        <div className="hub-hero-scene">
          <Suspense fallback={<HubSceneFallback />}>
            <PlayerScene cameraMode="hero" shadows={!isMobile} className="hub-canvas-wrapper">
              <HubScene3D players={squadPlayers} team={userTeam} maxPlayers={isMobile ? 5 : 8} />
            </PlayerScene>
          </Suspense>
        </div>

        <div className="hub-hero-overlay">
          <div className="hub-club-badge" style={{ background: userTeam.color, color: userTeam.color2 }}>
            <span>{userTeam.short}</span>
          </div>
          <div className="hub-club-info">
            <h2 className="hub-club-name">{userTeam.name}</h2>
            <div className="hub-club-chips">
              <span className="glass-chip">Season {season}</span>
              <span className="glass-chip">Round {round}</span>
              {leaguePosition > 0 && (
                <span className="glass-chip accent">
                  {leaguePosition}{positionSuffix(leaguePosition)} place
                </span>
              )}
              <span className="glass-chip gold">Budget {formatBudget(userTeam.budget)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hub-next-match">
        <h3 className="hub-section-title">Next Match</h3>
        {nextFixture && home && away ? (
          <div className="hub-match-card glass-panel">
            <div className="hub-match-team" style={{ background: home.color, color: home.color2 }}>
              <span className="hub-mt-short">{home.short}</span>
              <span className="hub-mt-name">{home.name}</span>
            </div>
            <div className="hub-match-vs">VS</div>
            <div className="hub-match-team" style={{ background: away.color, color: away.color2 }}>
              <span className="hub-mt-short">{away.short}</span>
              <span className="hub-mt-name">{away.name}</span>
            </div>
            <div className="hub-match-actions">
              <button type="button" className="btn primary lg" onClick={() => setView('match')}>
                Play Match
              </button>
              <span className="muted hub-match-info">
                {isHome ? 'Home' : 'Away'} vs {opponent?.name ?? 'Opponent'}
              </span>
            </div>
          </div>
        ) : (
          <div className="hub-match-card glass-panel season-complete">
            <p>Season complete. Review the table before starting the next campaign.</p>
            <button type="button" className="btn primary lg" onClick={advanceSeason}>Start Next Season</button>
          </div>
        )}
      </section>

      <div className="hub-bento">
        <div className="hub-bento-card glass-panel">
          <h3 className="hub-card-title">Club Operations</h3>
          <div className="hub-action-grid">
            <button type="button" className="glass-btn" onClick={() => setView('squad')}>
              Squad & Tactics
            </button>
            <button type="button" className="glass-btn" onClick={() => setView('transfers')}>
              Transfer Market
            </button>
            <button type="button" className="glass-btn" onClick={() => setView('training')}>
              Training
            </button>
            <button type="button" className="glass-btn" onClick={() => setView('table')}>
              League Table
            </button>
          </div>
        </div>

        <div className="hub-bento-card glass-panel">
          <h3 className="hub-card-title">Recent Form</h3>
          {recent.length === 0 && <p className="muted">No matches played yet.</p>}
          <ul className="hub-results">
            {recent.map((fixture) => {
              const userWasHome = fixture.homeId === userTeamId;
              const userGoals = Number(userWasHome ? fixture.homeGoals ?? 0 : fixture.awayGoals ?? 0);
              const opponentGoals = Number(userWasHome ? fixture.awayGoals ?? 0 : fixture.homeGoals ?? 0);
              const result = userGoals > opponentGoals ? 'W' : userGoals === opponentGoals ? 'D' : 'L';
              const opponentId = userWasHome ? fixture.awayId : fixture.homeId;
              const rival = teamById.get(opponentId);
              return (
                <li key={fixture.id} className="hub-result-row">
                  <span className={`glass-badge ${result.toLowerCase()}`}>{result}</span>
                  <span className="hub-result-score">{userGoals}-{opponentGoals}</span>
                  <span className="hub-result-opp">{rival?.short ?? '—'}</span>
                  <span className="hub-result-venue">{userWasHome ? 'H' : 'A'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hub-bento-card glass-panel">
          <h3 className="hub-card-title">Club News</h3>
          <ul className="hub-news">
            {recentNews.length === 0 && <li className="muted">No news yet.</li>}
            {recentNews.map((item, index) => (
              <li key={`${item}-${index}`} className="hub-news-item">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <LeagueTable />
    </div>
  );
}
