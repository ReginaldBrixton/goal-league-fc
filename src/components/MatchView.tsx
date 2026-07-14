import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useGame } from '../store/gameStore';
import { MatchEngine, type HudState, type InputState } from '../engine/matchEngine';
import { bestXI, simulateMatch } from '../engine/simEngine';
import type { MatchResult } from '../types';
import { PlayerScene } from '../three/PlayerScene';
import { MatchPreview3D } from '../three/MatchPreview3D';
import './MatchView.css';

type Mode = 'choose' | 'playing' | 'simming' | 'summary';
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

const keyboardAction = (code: string): InputAction | null => {
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
};

export function MatchView() {
  const userTeam = useGame((state) => state.userTeam);
  const teams = useGame((state) => state.teams);
  const players = useGame((state) => state.players);
  const nextFixture = useGame((state) => state.nextFixture);
  const recordSimResult = useGame((state) => state.recordSimResult);
  const setView = useGame((state) => state.setView);

  const [mode, setMode] = useState<Mode>('choose');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MatchEngine | null>(null);
  const frameRef = useRef<number | null>(null);
  const simTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const inputRef = useRef<InputState>(emptyInput());
  const pausedRef = useRef(false);
  const submittedRef = useRef(false);

  const home = useMemo(
    () => nextFixture ? teams.find((team) => team.id === nextFixture.homeId) ?? null : null,
    [nextFixture, teams],
  );
  const away = useMemo(
    () => nextFixture ? teams.find((team) => team.id === nextFixture.awayId) ?? null : null,
    [nextFixture, teams],
  );
  const homeXI = useMemo(
    () => home ? bestXI(players.filter((player) => player.teamId === home.id)) : [],
    [home, players],
  );
  const awayXI = useMemo(
    () => away ? bestXI(players.filter((player) => player.teamId === away.id)) : [],
    [away, players],
  );
  const userSide: 'home' | 'away' = home?.id === userTeam?.id ? 'home' : 'away';

  const clearInput = () => {
    inputRef.current = emptyInput();
  };

  const setPausedState = (value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
    clearInput();
    lastTimeRef.current = performance.now();
  };

  useEffect(() => {
    if (mode !== 'playing') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
        event.preventDefault();
        setPausedState(!pausedRef.current);
        return;
      }
      const action = keyboardAction(event.code);
      if (!action || pausedRef.current) return;
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
      if (document.hidden) {
        clearInput();
        setPausedState(true);
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
  }, [mode]);

  useEffect(() => {
    if (mode !== 'playing' || !home || !away) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const engine = new MatchEngine(
      home,
      away,
      homeXI,
      awayXI,
      { formation: '4-3-3', userSide, realSecondsPerMatchHalf: 45 },
      { onHud: setHud },
    );
    engineRef.current = engine;
    setHud(engine.getHud());
    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - lastTimeRef.current) / 1_000));
      lastTimeRef.current = time;

      if (!pausedRef.current) {
        engine.setInput(inputRef.current);
        engine.update(dt);
      }
      engine.render(context, canvas.width, canvas.height);

      if (engine.getHud().finished) {
        setHud(engine.getHud());
        setResult(engine.getResult());
        setMode('summary');
        return;
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      engineRef.current = null;
    };
  }, [away, awayXI, home, homeXI, mode, userSide]);

  useEffect(() => {
    if (mode !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const availableHeight = Math.max(280, window.innerHeight - 250);
      const availableWidth = Math.max(320, Math.min(window.innerWidth - 32, 1_150));
      const ratio = 105 / 68;
      let cssHeight = availableHeight;
      let cssWidth = cssHeight * ratio;
      if (cssWidth > availableWidth) {
        cssWidth = availableWidth;
        cssHeight = cssWidth / ratio;
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${Math.round(cssWidth)}px`;
      canvas.style.height = `${Math.round(cssHeight)}px`;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [mode]);

  useEffect(() => () => {
    if (simTimerRef.current !== null) window.clearTimeout(simTimerRef.current);
  }, []);

  const startPlay = () => {
    submittedRef.current = false;
    setResult(null);
    setHud(null);
    setPausedState(false);
    setMode('playing');
  };

  const startSim = () => {
    if (!home || !away) return;
    submittedRef.current = false;
    setResult(null);
    setMode('simming');
    simTimerRef.current = window.setTimeout(() => {
      const simulated = simulateMatch(home, away, homeXI, awayXI, Date.now() & 0x7fffffff);
      setResult(simulated);
      setMode('summary');
      simTimerRef.current = null;
    }, 120);
  };

  const finish = () => {
    if (!submittedRef.current && result && nextFixture) {
      submittedRef.current = true;
      recordSimResult(nextFixture.id, result);
    }
    setView('hub');
  };

  const exitWithoutResult = () => {
    setPausedState(false);
    setView('hub');
  };

  const setTouchAction = (action: InputAction, pressed: boolean) => {
    if (pausedRef.current) return;
    inputRef.current[action] = pressed;
  };

  if (!nextFixture || !home || !away) {
    return (
      <div className="panel">
        <p>No match is available. The season may be complete.</p>
        <button type="button" className="btn" onClick={() => setView('hub')}>Back to Hub</button>
      </div>
    );
  }

  if (mode === 'choose') {
    const lineupReady = homeXI.length >= 11 && awayXI.length >= 11;
    return (
      <div className="match-setup-3d">
        <div className="match-preview-scene">
          <Suspense fallback={<div className="match-preview-fallback" />}>
            <PlayerScene cameraMode="lineup" shadows>
              <MatchPreview3D homeTeam={home} awayTeam={away} homeXI={homeXI} awayXI={awayXI} />
            </PlayerScene>
          </Suspense>
          <div className="match-preview-overlay">
            <div className="match-preview-teams">
              <div className="match-preview-team" style={{ background: home.color, color: home.color2 }}>
                <span className="mp-team-short">{home.short}</span>
                <span className="mp-team-name">{home.name}</span>
              </div>
              <span className="match-preview-vs">VS</span>
              <div className="match-preview-team" style={{ background: away.color, color: away.color2 }}>
                <span className="mp-team-short">{away.short}</span>
                <span className="mp-team-name">{away.name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel match-setup-panel">
          <p className="muted">
            You control <b>{userSide === 'home' ? home.name : away.name}</b> ({userSide === 'home' ? 'Home' : 'Away'}).
          </p>
          {!lineupReady && <p className="warning">One or both clubs have fewer than 11 available players. The match will use every available player.</p>}
          <div className="menu-buttons">
            <button type="button" className="btn primary lg" onClick={startPlay}>Play Match</button>
            <button type="button" className="btn lg" onClick={startSim}>Quick Sim</button>
            <button type="button" className="btn" onClick={() => setView('hub')}>Back</button>
          </div>
          <div className="controls-help">
            <h3>Controls</h3>
            <p><b>Arrow Keys / WASD</b> move · <b>J / Space</b> pass · <b>K</b> shoot</p>
            <p><b>L</b> slide tackle · <b>Shift / Q</b> switch player · <b>Esc / P</b> pause</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'simming') {
    return <div className="panel" aria-live="polite"><p>Simulating the match…</p></div>;
  }

  if (mode === 'summary' && result) {
    return (
      <MatchSummary
        result={result}
        home={home}
        away={away}
        userSide={userSide}
        playedHud={hud}
        onContinue={finish}
      />
    );
  }

  const possession = Math.round((hud?.possessionHome ?? 0.5) * 100);

  return (
    <div className="match-play">
      <div className="match-hud" aria-live="polite">
        <span className="hud-team" style={{ background: home.color, color: home.color2 }}>{home.short}</span>
        <span className="hud-score">{hud?.homeGoals ?? 0} - {hud?.awayGoals ?? 0}</span>
        <span className="hud-team" style={{ background: away.color, color: away.color2 }}>{away.short}</span>
        <span className="hud-minute">{hud?.minute ?? 1}'</span>
        <span className="hud-possession" title="Home possession">{possession}%</span>
      </div>

      <div className="pitch-wrap">
        <canvas
          ref={canvasRef}
          width={1050}
          height={680}
          className="pitch-canvas fit-height"
          role="img"
          aria-label={`Live match: ${home.name} against ${away.name}`}
        />

        {paused && (
          <div className="match-pause-overlay" role="dialog" aria-modal="true" aria-labelledby="paused-title">
            <div className="panel">
              <h2 id="paused-title">Match Paused</h2>
              <div className="menu-buttons">
                <button type="button" className="btn primary" onClick={() => setPausedState(false)}>Resume</button>
                <button type="button" className="btn" onClick={() => { setPausedState(false); setMode('choose'); }}>Restart Setup</button>
                <button type="button" className="btn danger" onClick={exitWithoutResult}>Exit Match</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="match-events" aria-live="polite">
        {hud?.events.slice(-4).map((event, index) => (
          <div key={`${event.minute}-${event.text}-${index}`} className="event-line">{event.minute}' — {event.text}</div>
        ))}
      </div>

      <div className="touch-controls" aria-label="On-screen match controls">
        <div className="touch-dpad">
          {(['up', 'left', 'down', 'right'] as const).map((action) => (
            <button
              type="button"
              key={action}
              className={`touch-btn ${action}`}
              aria-label={`Move ${action}`}
              onPointerDown={() => setTouchAction(action, true)}
              onPointerUp={() => setTouchAction(action, false)}
              onPointerCancel={() => setTouchAction(action, false)}
              onPointerLeave={() => setTouchAction(action, false)}
            >
              {action === 'up' ? '↑' : action === 'down' ? '↓' : action === 'left' ? '←' : '→'}
            </button>
          ))}
        </div>
        <div className="touch-actions">
          {([
            ['pass', 'Pass'],
            ['shoot', 'Shoot'],
            ['slide', 'Tackle'],
            ['switchPlayer', 'Switch'],
          ] as const).map(([action, label]) => (
            <button
              type="button"
              key={action}
              className={`touch-btn action ${action}`}
              onPointerDown={() => setTouchAction(action, true)}
              onPointerUp={() => setTouchAction(action, false)}
              onPointerCancel={() => setTouchAction(action, false)}
              onPointerLeave={() => setTouchAction(action, false)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="muted">
        Active: {hud?.activePlayerName ?? '—'} · Shots {hud?.shotsHome ?? 0}-{hud?.shotsAway ?? 0} · Esc/P pauses
      </p>
    </div>
  );
}

function MatchSummary({
  result,
  home,
  away,
  userSide,
  playedHud,
  onContinue,
}: {
  result: MatchResult;
  home: { name: string; short: string; color: string; color2: string; id: string };
  away: { name: string; short: string; color: string; color2: string; id: string };
  userSide: 'home' | 'away';
  playedHud: HudState | null;
  onContinue: () => void;
}) {
  const userGoals = userSide === 'home' ? result.homeGoals : result.awayGoals;
  const opponentGoals = userSide === 'home' ? result.awayGoals : result.homeGoals;
  const outcome = userGoals > opponentGoals ? 'WIN' : userGoals === opponentGoals ? 'DRAW' : 'LOSS';
  const possession = playedHud ? Math.round(playedHud.possessionHome * 100) : null;

  return (
    <div className="panel summary">
      <h2>Full Time</h2>
      <div className="ft-score">
        <span className="hud-team" style={{ background: home.color, color: home.color2 }}>{home.short}</span>
        <span className="ft-goals">{result.homeGoals} - {result.awayGoals}</span>
        <span className="hud-team" style={{ background: away.color, color: away.color2 }}>{away.short}</span>
      </div>
      <div className={`outcome ${outcome.toLowerCase()}`}>{outcome}</div>

      <div className="ft-stats">
        <span>Shots: {result.homeShots} - {result.awayShots}</span>
        {possession !== null && <span>Possession: {possession}% - {100 - possession}%</span>}
      </div>

      <div className="scorers-list">
        <h3>Scorers</h3>
        {result.scorers.length === 0 && <p className="muted">No goals.</p>}
        {result.scorers
          .slice()
          .sort((a, b) => a.minute - b.minute)
          .map((scorer, index) => (
            <div key={`${scorer.playerId}-${scorer.minute}-${index}`} className="scorer-line">
              <span>{scorer.minute}'</span>
              <span>{scorer.name}</span>
              <span className="muted">{scorer.teamId === home.id ? home.short : away.short}</span>
            </div>
          ))}
      </div>

      <button type="button" className="btn primary" onClick={onContinue}>Continue</button>
    </div>
  );
}