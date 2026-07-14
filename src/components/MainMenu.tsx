import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/gameStore';
import { hasSave } from '../utils/storage';
import { clubNames } from '../data/names';
import './MainMenu.css';

function readHasSave(): boolean {
  try {
    return hasSave();
  } catch {
    return false;
  }
}

export function MainMenu() {
  const newCareer = useGame((state) => state.newCareer);
  const continueCareer = useGame((state) => state.continueCareer);
  const [hasExisting, setHasExisting] = useState(readHasSave);
  const [showPick, setShowPick] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pick, setPick] = useState(0);

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

  const selectedClub = useMemo(() => clubNames[pick] ?? clubNames[0], [pick]);

  const beginNewCareer = () => {
    if (hasExisting) setConfirmOverwrite(true);
    else setShowPick(true);
  };

  const openClubPicker = () => {
    setConfirmOverwrite(false);
    setShowPick(true);
  };

  const startCareer = () => {
    if (!selectedClub) return;
    newCareer(pick);
  };

  return (
    <main className="menu">
      <h1 className="title">GOAL LEAGUE <span>FC</span></h1>
      <p className="subtitle">Build your club. Develop the squad. Play the matches. Win the league.</p>

      {!showPick && !confirmOverwrite && (
        <div className="menu-buttons">
          <button type="button" className="btn primary" onClick={beginNewCareer}>New Career</button>
          <button type="button" className="btn" disabled={!hasExisting} onClick={continueCareer}>
            Continue Career
          </button>
        </div>
      )}

      {confirmOverwrite && (
        <section className="panel" role="alertdialog" aria-labelledby="overwrite-title">
          <h2 id="overwrite-title">Start a new career?</h2>
          <p>Your current saved career will be replaced when the new career is created.</p>
          <div className="menu-buttons">
            <button type="button" className="btn" onClick={() => setConfirmOverwrite(false)}>Cancel</button>
            <button type="button" className="btn danger" onClick={openClubPicker}>Choose New Club</button>
          </div>
        </section>
      )}

      {showPick && (
        <section className="pick-team" aria-labelledby="choose-club-title">
          <h2 id="choose-club-title">Choose your club</h2>
          <div className="team-grid">
            {clubNames.map((club, index) => (
              <button
                type="button"
                key={`${club.short}-${index}`}
                className={`team-pick${pick === index ? ' selected' : ''}`}
                style={{ background: club.color, color: club.color2 }}
                onClick={() => setPick(index)}
                aria-pressed={pick === index}
              >
                <span className="tp-short">{club.short}</span>
                <span className="tp-name">{club.name}</span>
              </button>
            ))}
          </div>
          <div className="menu-buttons">
            <button type="button" className="btn" onClick={() => setShowPick(false)}>Back</button>
            <button type="button" className="btn primary" disabled={!selectedClub} onClick={startCareer}>
              Start with {selectedClub?.short ?? 'Club'}
            </button>
          </div>
        </section>
      )}

      <p className="hint">
        A fictional football management and playable-match game. Clubs and players are original fictional creations.
      </p>
    </main>
  );
}