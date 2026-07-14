import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { bestXI } from '../engine/simEngine';
import {
  type HudState,
  type InputState,
} from '../engine/matchEngine';
import {
  createStrategicMatchEngine,
  getMatchDebugSnapshot,
} from '../engine/strategicMatchEngine';
import type { MatchResult, Player } from '../types';
import { usePressControls } from '../input/usePressControls';
import { LiveMatch3D } from '../three/LiveMatch3D';
import { readMatchSettings } from '../utils/matchSettings';
import './GameControls.css';

interface GamePageProps {
  gameId: string;
}

type InputAction = keyof InputState;

const emptyInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  pass: false,
  shoot: false,
  switchPlayer: false,
  slide: false,
});

function keyboardAction(code: string): InputAction | null {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW': return 'up';
    case 'ArrowDown':
    case 'KeyS': return 'down';
    case 'ArrowLeft':
    case 'KeyA': return 'left';
    case 'ArrowRight':
    case 'KeyD': return 'right';
    case 'Space':
    case 'KeyJ': return 'pass';
    case 'KeyK': return 'shoot';
    case 'KeyL': return 'slide';
    case 'ShiftLeft':
    case 'ShiftRight':
    case 'KeyQ': return 'switchPlayer';
    default: return null;
  }
}

function clampRating(value: number): number {
  return Math.max(20, Math.min(99, value));
}

function adjustDifficulty(players: Player[], amount: number): Player[] {
  if (amount === 0) return players;
  return players.map((player) => ({
    ...player,
    rating: clampRating(player.rating + amount),
    pace: clampRating(player.pace + amount),
    passing: clampRating(player.passing + amount),
    shooting: clampRating(player.shooting + amount),
    defending: clampRating(player.defending + amount),
  }));
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const rotations = { up: 0, right: 90, down: 180, left: 270 } as const;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={{ transform: `rotate(${rotations[direction]}deg)` }}>
      <path d="M12 4 4.5 13h4.7v7h5.6v-7h4.7L12 4Z" />
    </svg>
  );
}

export function GamePage({ gameId }: GamePageProps) {
  const navigate = useNavigate();
  const teams = useGame((state) => state.teams);
  const players = useGame((state) => state.players);
  const fixtures = useGame((state) => state.fixtures);
  const userTeam = useGame((state) => state.userTeam);
  const recordSimResult = useGame((state) => state.recordSimResult);

  const settings = useMemo(() => readMatchSettings(gameId), [gameId]);
  const fixture = useMemo(() => fixtures.find((item) => item.id === gameId && !item.played) ?? null, [fixtures, gameId]);
  const home = useMemo(() => teams.find((team) => team.id === fixture?.homeId) ?? null, [fixture?.homeId, teams]);
  const away = useMemo(() => teams.find((team) => team.id === fixture?.awayId) ?? null, [fixture?.awayId, teams]);
  const userSide: 'home' | 'away' = home?.id === userTeam?.id ? 'home' : 'away';
  const difficultyDelta = settings.difficulty === 'rookie' ? -5 : settings.difficulty === 'legend' ? 5 : 0;

  const rawHomeXI = useMemo(() => home ? bestXI(players.filter((player) => player.teamId === home.id)) : [], [home, players]);
  const rawAwayXI = useMemo(() => away ? bestXI(players.filter((player) => player.teamId === away.id)) : [], [away, players]);
  const homeXI = useMemo(
    () => userSide === 'away' ? adjustDifficulty(rawHomeXI, difficultyDelta) : rawHomeXI,
    [difficultyDelta, rawHomeXI, userSide],
  );
  const awayXI = useMemo(
    () => userSide === 'home' ? adjustDifficulty(rawAwayXI, difficultyDelta) : rawAwayXI,
    [difficultyDelta, rawAwayXI, userSide],
  );

  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const inputRef = useRef<InputState>(emptyInput());
  const submittedRef = useRef(false);
  const { bindPress, pressedActions, clearPresses } = usePressControls(inputRef, paused || Boolean(result));

  const engine = useMemo(() => {
    if (!home || !away || homeXI.length === 0 || awayXI.length === 0) return null;
    return createStrategicMatchEngine(
      home,
      away,
      homeXI,
      awayXI,
      {
        formation: '4-3-3',
        userSide,
        realSecondsPerMatchHalf: settings.duration,
        aiLevel: settings.difficulty,
      },
      { onHud: setHud },
      [...gameId].reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 97),
    );
  }, [away, awayXI, gameId, home, homeXI, settings.difficulty, settings.duration, userSide]);

  const clearInput = useCallback(() => {
    clearPresses();
    inputRef.current = emptyInput();
  }, [clearPresses]);

  const togglePause = useCallback(() => {
    clearInput();
    setPaused((current) => !current);
  }, [clearInput]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat && !result) {
        event.preventDefault();
        togglePause();
        return;
      }
      const action = keyboardAction(event.code);
      if (!action || paused || result) return;
      inputRef.current[action] = true;
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const action = keyboardAction(event.code);
      if (!action) return;
      inputRef.current[action] = false;
      event.preventDefault();
    };

    const onBlur = () => clearInput();
    const onVisibility = () => {
      if (document.hidden && !result) {
        clearInput();
        setPaused(true);
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInput();
    };
  }, [clearInput, paused, result, togglePause]);

  useEffect(() => {
    const diagnosticsEnabled = navigator.webdriver || new URLSearchParams(window.location.search).has('debugControls');
    if (!engine || !diagnosticsEnabled) return;
    const debugWindow = window as typeof window & {
      __goalLeagueDebug?: {
        snapshot: () => ReturnType<typeof getMatchDebugSnapshot>;
        input: () => InputState;
      };
    };
    debugWindow.__goalLeagueDebug = {
      snapshot: () => getMatchDebugSnapshot(engine),
      input: () => ({ ...inputRef.current }),
    };
    return () => {
      delete debugWindow.__goalLeagueDebug;
    };
  }, [engine]);

  const finishMatch = useCallback((nextResult: MatchResult) => {
    clearInput();
    setHud(engine?.getHud() ?? null);
    setResult(nextResult);
    setPaused(true);
  }, [clearInput, engine]);

  const continueCareer = () => {
    if (result && fixture && !submittedRef.current) {
      submittedRef.current = true;
      recordSimResult(fixture.id, result);
    }
    navigate({ to: '/hub' });
  };

  if (!fixture || !home || !away || !userTeam || !engine) {
    return (
      <main className="match-route-error">
        <span>GAME SESSION UNAVAILABLE</span>
        <h1>The live match could not start.</h1>
        <p>Return to the career hub and select the current fixture again.</p>
        <button type="button" className="native-cta primary" onClick={() => navigate({ to: '/hub' })}>
          <span>Return to Hub</span><b>→</b>
        </button>
      </main>
    );
  }

  const possession = Math.round((hud?.possessionHome ?? 0.5) * 100);
  const activeName = hud?.activePlayerName ?? 'Selecting player';

  return (
    <main className="game-screen" onContextMenu={(event) => event.preventDefault()}>
      <div className="game-viewport">
        <LiveMatch3D
          engine={engine}
          inputRef={inputRef}
          paused={paused || Boolean(result)}
          cameraMode={settings.camera}
          graphics={settings.graphics}
          home={home}
          away={away}
          onFinished={finishMatch}
        />
      </div>

      <header className="game-scorebar" aria-live="polite">
        <div className="game-team home">
          <span style={{ background: home.color, color: home.color2 }}>{home.short}</span>
          <strong>{home.name}</strong>
        </div>
        <div className="game-score">
          <span>{hud?.homeGoals ?? 0}</span><i>:</i><span>{hud?.awayGoals ?? 0}</span>
          <small>{hud?.minute ?? 1}'</small>
        </div>
        <div className="game-team away">
          <strong>{away.name}</strong>
          <span style={{ background: away.color, color: away.color2 }}>{away.short}</span>
        </div>
      </header>

      <aside className="game-performance-panel">
        <div><span>POSSESSION</span><strong>{possession}%</strong><small>{100 - possession}%</small></div>
        <div><span>SHOTS</span><strong>{hud?.shotsHome ?? 0}</strong><small>{hud?.shotsAway ?? 0}</small></div>
        <div><span>ACTIVE</span><strong className="active-player-name">{activeName}</strong></div>
      </aside>

      <div className="game-event-feed" aria-live="polite">
        {(hud?.events ?? []).slice(-3).reverse().map((event, index) => (
          <div key={`${event.minute}-${event.text}-${index}`}><b>{event.minute}'</b><span>{event.text}</span></div>
        ))}
      </div>

      <button type="button" className="game-pause-button" onClick={togglePause} aria-label="Pause match">Ⅱ</button>

      <div className="game-touch-controls" aria-label="On-screen football controls" onContextMenu={(event) => event.preventDefault()}>
        <div className="game-stick" role="group" aria-label="Movement controls">
          {(['up', 'left', 'down', 'right'] as const).map((direction) => (
            <button
              type="button"
              key={direction}
              className={`stick-${direction}${pressedActions.has(direction) ? ' is-pressed' : ''}`}
              aria-label={`Move ${direction}`}
              aria-pressed={pressedActions.has(direction)}
              data-pressed={pressedActions.has(direction) ? 'true' : 'false'}
              {...bindPress(direction)}
            >
              <ArrowIcon direction={direction} />
            </button>
          ))}
          <i aria-hidden="true" />
        </div>
        <div className="game-action-buttons">
          {([
            ['shoot', 'A', 'SHOOT'],
            ['pass', 'B', 'PASS'],
            ['slide', 'C', 'TACKLE'],
            ['switchPlayer', 'D', 'SWITCH'],
          ] as const).map(([action, key, label]) => (
            <button
              type="button"
              key={action}
              className={`game-action ${action}${pressedActions.has(action) ? ' is-pressed' : ''}`}
              aria-label={label.charAt(0) + label.slice(1).toLowerCase()}
              aria-pressed={pressedActions.has(action)}
              data-pressed={pressedActions.has(action) ? 'true' : 'false'}
              {...bindPress(action)}
            >
              <b>{key}</b><span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {paused && !result && (
        <div className="game-modal-layer" role="dialog" aria-modal="true" aria-labelledby="game-paused-title">
          <section className="game-pause-card">
            <span>MATCH INTERRUPTED</span>
            <h1 id="game-paused-title">Paused</h1>
            <p>{home.short} {hud?.homeGoals ?? 0}–{hud?.awayGoals ?? 0} {away.short} · {hud?.minute ?? 1}'</p>
            <button type="button" className="native-cta primary" onClick={() => setPaused(false)}><span>Resume Match</span><b>▶</b></button>
            <button type="button" className="native-cta" onClick={() => navigate({ to: '/hub' })}><span>Exit Without Result</span><b>×</b></button>
          </section>
        </div>
      )}

      {result && (
        <div className="game-modal-layer result-layer" role="dialog" aria-modal="true" aria-labelledby="full-time-title">
          <section className="game-result-card">
            <span>FULL TIME</span>
            <h1 id="full-time-title">{home.short} {result.homeGoals}–{result.awayGoals} {away.short}</h1>
            <div className="game-result-stats">
              <div><small>SHOTS</small><strong>{result.homeShots} – {result.awayShots}</strong></div>
              <div><small>POSSESSION</small><strong>{possession}% – {100 - possession}%</strong></div>
              <div><small>DIFFICULTY</small><strong>{settings.difficulty.toUpperCase()}</strong></div>
            </div>
            <div className="game-scorers">
              {result.scorers.length === 0 ? <p>No goals scored.</p> : result.scorers.slice().sort((a, b) => a.minute - b.minute).map((scorer, index) => (
                <p key={`${scorer.playerId}-${scorer.minute}-${index}`}><b>{scorer.minute}'</b><span>{scorer.name}</span><small>{scorer.teamId === home.id ? home.short : away.short}</small></p>
              ))}
            </div>
            <button type="button" className="native-cta primary" onClick={continueCareer}><span>Continue Career</span><b>→</b></button>
          </section>
        </div>
      )}
    </main>
  );
}
