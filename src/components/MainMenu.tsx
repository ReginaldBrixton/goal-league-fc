import { Suspense, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { hasSave } from '../utils/storage';
import { PlayerScene } from '../three/PlayerScene';
import { LandingScene3D } from '../three/LandingScene3D';
import './MainMenu.css';

function readHasSave(): boolean {
  try {
    return hasSave();
  } catch {
    return false;
  }
}

export function MainMenu() {
  const navigate = useNavigate();
  const continueCareer = useGame((state) => state.continueCareer);
  const [hasExisting, setHasExisting] = useState(readHasSave);

  useEffect(() => {
    const refresh = () => setHasExisting(readHasSave());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const resume = () => {
    const loaded = continueCareer();
    if (loaded) navigate({ to: '/hub' });
    else setHasExisting(false);
  };

  return (
    <main className="landing-native">
      <div className="landing-noise" />
      <section className="landing-copy">
        <div className="landing-brand" aria-label="Goal League Football Club">
          <span className="landing-brand-mark">GL</span>
          <span>GOAL LEAGUE FC</span>
        </div>

        <div className="landing-heading">
          <h1>BUILD THE CLUB.<br /><strong>CONTROL THE MATCH.</strong></h1>
          <p>
            A complete football career built around live matches, tactical decisions,
            player development and a responsive console-style interface.
          </p>
        </div>

        <div className="landing-actions">
          <button
            type="button"
            className="native-cta primary"
            onClick={() => navigate({ to: '/start-career' })}
          >
            <span>Start New Career</span>
            <b>→</b>
          </button>
          <button type="button" className="native-cta" disabled={!hasExisting} onClick={resume}>
            <span>{hasExisting ? 'Continue Career' : 'No Saved Career'}</span>
            <b>▶</b>
          </button>
        </div>

        <div className="landing-status-row" aria-label="Game features">
          <div><span>01</span><b>LIVE 3D MATCHES</b><small>Keyboard + touch controls</small></div>
          <div><span>02</span><b>CAREER SYSTEM</b><small>Squads, training and transfers</small></div>
          <div><span>03</span><b>LOCAL SAVE</b><small>Fast cached loading</small></div>
        </div>
      </section>

      <section className="landing-stage" aria-label="Live three-dimensional football preview">
        <div className="landing-stage-label"><span>LIVE ENGINE</span><b>60 FPS TARGET</b></div>
        <Suspense fallback={<div className="landing-scene-fallback" />}>
          <PlayerScene cameraMode="hero" shadows className="landing-scene" cameraPosition={[0, 3.7, 7.4]} fov={42}>
            <LandingScene3D />
          </PlayerScene>
        </Suspense>
        <div className="landing-stage-caption">
          <span>PROCEDURAL PLAYERS</span>
          <strong>REAL-TIME WEBGL</strong>
        </div>
      </section>
    </main>
  );
}
