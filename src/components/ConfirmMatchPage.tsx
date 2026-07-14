import { Suspense, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { bestXI } from '../engine/simEngine';
import { PlayerScene } from '../three/PlayerScene';
import { MatchPreview3D } from '../three/MatchPreview3D';
import {
  DEFAULT_MATCH_SETTINGS,
  writeMatchSettings,
  type MatchCamera,
  type MatchDifficulty,
  type MatchGraphics,
  type MatchSettings,
} from '../utils/matchSettings';

interface ConfirmMatchPageProps {
  matchId: string;
}

const DIFFICULTIES: { value: MatchDifficulty; label: string; detail: string }[] = [
  { value: 'rookie', label: 'Rookie', detail: 'More space and slower pressure' },
  { value: 'professional', label: 'Professional', detail: 'Balanced competitive football' },
  { value: 'legend', label: 'Legend', detail: 'Sharper opponents and less time' },
];

const CAMERAS: { value: MatchCamera; label: string }[] = [
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'tactical', label: 'Tactical' },
];

const GRAPHICS: { value: MatchGraphics; label: string }[] = [
  { value: 'battery', label: 'Battery' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'ultra', label: 'Ultra' },
];

export function ConfirmMatchPage({ matchId }: ConfirmMatchPageProps) {
  const navigate = useNavigate();
  const teams = useGame((state) => state.teams);
  const players = useGame((state) => state.players);
  const fixtures = useGame((state) => state.fixtures);
  const userTeam = useGame((state) => state.userTeam);
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_MATCH_SETTINGS);

  const fixture = useMemo(
    () => fixtures.find((item) => item.id === matchId && !item.played) ?? null,
    [fixtures, matchId],
  );
  const home = useMemo(() => teams.find((team) => team.id === fixture?.homeId) ?? null, [fixture?.homeId, teams]);
  const away = useMemo(() => teams.find((team) => team.id === fixture?.awayId) ?? null, [fixture?.awayId, teams]);
  const homeXI = useMemo(() => home ? bestXI(players.filter((player) => player.teamId === home.id)) : [], [home, players]);
  const awayXI = useMemo(() => away ? bestXI(players.filter((player) => player.teamId === away.id)) : [], [away, players]);

  if (!fixture || !home || !away || !userTeam) {
    return (
      <main className="match-route-error">
        <span>FIXTURE UNAVAILABLE</span>
        <h1>This match cannot be prepared.</h1>
        <p>It may already have been played or the saved career has changed.</p>
        <button type="button" className="native-cta primary" onClick={() => navigate({ to: '/hub' })}>
          <span>Return to Hub</span><b>→</b>
        </button>
      </main>
    );
  }

  const userIsHome = home.id === userTeam.id;
  const update = <K extends keyof MatchSettings>(key: K, value: MatchSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const start = () => {
    writeMatchSettings(fixture.id, settings);
    navigate({ to: '/game/$gameId', params: { gameId: fixture.id } });
  };

  return (
    <main className="match-confirm-screen">
      <header className="match-confirm-header">
        <button type="button" className="icon-control" onClick={() => navigate({ to: '/hub' })} aria-label="Return to career hub">←</button>
        <div><span>LEAGUE MATCH · ROUND {fixture.round}</span><strong>Match Centre</strong></div>
        <div className="match-venue"><i />{userIsHome ? 'HOME' : 'AWAY'}</div>
      </header>

      <section className="match-confirm-stage">
        <Suspense fallback={<div className="match-preview-fallback" />}>
          <PlayerScene cameraMode="lineup" shadows={settings.graphics !== 'battery'} className="match-confirm-canvas" cameraPosition={[0, 3.7, 9.2]} fov={48}>
            <MatchPreview3D homeTeam={home} awayTeam={away} homeXI={homeXI} awayXI={awayXI} />
          </PlayerScene>
        </Suspense>
        <div className="match-confirm-scoreboard">
          <div className="confirm-team home">
            <span className="confirm-crest" style={{ background: home.color, color: home.color2 }}>{home.short}</span>
            <div><small>HOME</small><strong>{home.name}</strong><p>OVR {Math.round(homeXI.reduce((sum, player) => sum + player.rating, 0) / Math.max(1, homeXI.length))}</p></div>
          </div>
          <div className="confirm-vs"><span>VS</span><small>READY</small></div>
          <div className="confirm-team away">
            <div><small>AWAY</small><strong>{away.name}</strong><p>OVR {Math.round(awayXI.reduce((sum, player) => sum + player.rating, 0) / Math.max(1, awayXI.length))}</p></div>
            <span className="confirm-crest" style={{ background: away.color, color: away.color2 }}>{away.short}</span>
          </div>
        </div>
      </section>

      <aside className="match-settings-panel">
        <div className="settings-title"><span>MATCH SETTINGS</span><b>Fine-tune before kick-off</b></div>

        <div className="setting-group">
          <label>Difficulty</label>
          <div className="setting-options vertical">
            {DIFFICULTIES.map((item) => (
              <button
                type="button"
                key={item.value}
                className={settings.difficulty === item.value ? 'selected' : ''}
                onClick={() => update('difficulty', item.value)}
              >
                <span>{item.label}</span><small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group compact-setting">
          <label>Match Half</label>
          <div className="setting-options">
            {([30, 45, 60] as const).map((duration) => (
              <button type="button" key={duration} className={settings.duration === duration ? 'selected' : ''} onClick={() => update('duration', duration)}>
                {duration}s
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group compact-setting">
          <label>Camera</label>
          <div className="setting-options">
            {CAMERAS.map((item) => (
              <button type="button" key={item.value} className={settings.camera === item.value ? 'selected' : ''} onClick={() => update('camera', item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group compact-setting graphics-setting">
          <label>Graphics</label>
          <div className="setting-options">
            {GRAPHICS.map((item) => (
              <button type="button" key={item.value} className={settings.graphics === item.value ? 'selected' : ''} onClick={() => update('graphics', item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="kickoff-button" onClick={start} disabled={homeXI.length === 0 || awayXI.length === 0}>
          <span>KICK OFF</span><b>▶</b>
        </button>
        <p className="settings-footnote">WASD / arrows to move · J pass · K shoot · L tackle · Q switch</p>
      </aside>
    </main>
  );
}
