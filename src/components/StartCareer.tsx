import { Suspense, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { OrbitControls } from '@react-three/drei';
import { clubNames } from '../data/names';
import { useGame } from '../store/gameStore';
import { PlayerScene } from '../three/PlayerScene';
import { Pitch3D } from '../three/Pitch3D';
import { PlayerModel } from '../three/PlayerModel';
import { CAREER_PLAYER_SCALE, DETAIL_MAX_DPR } from '../three/playerPresentation';

const FLAGS = ['🇬🇭', '🇬🇧', '🇵🇹', '🇩🇪', '🇳🇱', '🇧🇷', '🇯🇵', '🇫🇷', '🇺🇸', '🇿🇦'];
const IDENTITIES = [
  'High press · Fast transitions',
  'Direct attack · Physical midfield',
  'Possession · Technical development',
  'Compact defence · Counter attack',
  'Wide overloads · Aggressive full-backs',
  'Fluid movement · Creative midfield',
  'Youth academy · High tempo',
  'Balanced shape · Set-piece strength',
  'Athletic squad · Vertical football',
  'Patient buildup · Elite pressing',
];

export function StartCareer() {
  const navigate = useNavigate();
  const newCareer = useGame((state) => state.newCareer);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const selected = clubNames[selectedIndex] ?? clubNames[0];

  const squadNumber = useMemo(() => 8 + ((selectedIndex * 7) % 19), [selectedIndex]);

  const createCareer = () => {
    if (!selected || creating) return;
    setCreating(true);
    window.setTimeout(() => newCareer(selectedIndex), 240);
  };

  return (
    <main className="career-select-screen">
      <header className="career-select-topbar">
        <button type="button" className="icon-control" onClick={() => navigate({ to: '/' })} aria-label="Return to dashboard">←</button>
        <div>
          <span>NEW CAREER</span>
          <strong>Choose Your Club</strong>
        </div>
        <div className="career-step"><b>1</b><span>OF 3</span></div>
      </header>

      <section className="career-club-rail" aria-label="Available clubs">
        {clubNames.map((club, index) => (
          <button
            type="button"
            key={club.short}
            className={`career-club-card${selectedIndex === index ? ' selected' : ''}`}
            onClick={() => setSelectedIndex(index)}
            aria-pressed={selectedIndex === index}
          >
            <span className="career-flag">{FLAGS[index]}</span>
            <span className="career-crest" style={{ background: club.color, color: club.color2 }}>
              <i>{club.short.slice(0, 1)}</i><b>{club.short}</b>
            </span>
            <strong>{club.name}</strong>
            <small>{IDENTITIES[index]}</small>
          </button>
        ))}
      </section>

      <section className="career-selected-club">
        <div className="career-kit-stage">
          <div className="career-kit-lights" />
          <Suspense fallback={<div className="career-kit-fallback" />}>
            <PlayerScene
              cameraMode="card"
              shadows
              className="career-kit-canvas"
              cameraPosition={[0, 1.35, 3.9]}
              fov={36}
              maxDpr={DETAIL_MAX_DPR}
            >
              <Pitch3D width={4.2} length={6.4} />
              <PlayerModel
                position={[0, 0.02, 0.14]}
                rotation={[0, Math.PI, 0]}
                scale={CAREER_PLAYER_SCALE}
                teamId={selected.short}
                primaryColor={selected.color}
                secondaryColor={selected.color2}
                number={squadNumber}
                animation="idle"
                skinColor={selectedIndex % 3 === 0 ? '#6a4332' : selectedIndex % 3 === 1 ? '#d5a077' : '#9d6b4d'}
                highlight
                variant="detail"
              />
              <OrbitControls
                makeDefault
                enablePan={false}
                enableZoom
                minDistance={3.3}
                maxDistance={5.2}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2.05}
                autoRotate
                autoRotateSpeed={0.55}
                target={[0, 0.72, 0]}
              />
              <spotLight position={[2.8, 5, 3]} intensity={2.5} angle={0.5} penumbra={0.7} color={selected.color2} castShadow />
              <pointLight position={[-2, 1.5, 1]} intensity={2} color={selected.color} />
            </PlayerScene>
          </Suspense>
          <div className="career-drag-hint">DRAG TO ROTATE · PINCH TO ZOOM</div>
        </div>

        <div className="career-club-profile">
          <div className="career-profile-title">
            <div className="career-profile-crest" style={{ background: selected.color, color: selected.color2 }}>{selected.short}</div>
            <div><span>{FLAGS[selectedIndex]} FICTIONAL PREMIER DIVISION</span><h1>{selected.name}</h1></div>
          </div>

          <p>{IDENTITIES[selectedIndex]}. Build a squad around the club identity, control every important match and develop the next generation.</p>

          <div className="career-profile-stats">
            <div><span>TRANSFER BUDGET</span><strong>$5.00M</strong></div>
            <div><span>SQUAD SIZE</span><strong>22</strong></div>
            <div><span>CLUB LEVEL</span><strong>{68 + selectedIndex}</strong></div>
          </div>

          <div className="career-colour-strip">
            <span style={{ background: selected.color }} /><span style={{ background: selected.color2 }} />
            <b>HOME KIT COLOURS</b>
          </div>

          <button type="button" className="native-cta primary career-begin" onClick={createCareer} disabled={creating}>
            <span>{creating ? 'Creating Career…' : `Begin with ${selected.short}`}</span><b>→</b>
          </button>
        </div>
      </section>
    </main>
  );
}
