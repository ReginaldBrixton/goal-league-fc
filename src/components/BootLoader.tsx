import { useEffect, useMemo, useState, type ReactNode } from 'react';

type BootLoaderProps = {
  children: ReactNode;
};

const warmers = [
  () => import('./MainMenu'),
  () => import('./StartCareer'),
  () => import('./CareerHub'),
  () => import('./ConfirmMatchPage'),
  () => import('./GamePage'),
  () => import('../three/PlayerModel'),
  () => import('../three/LiveMatch3D'),
  () => import('../data/teams'),
  () => import('../engine/matchEngine'),
];

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function BootLoader({ children }: BootLoaderProps) {
  const wasWarm = useMemo(
    () => canUseDom() && window.sessionStorage.getItem('glfc:boot-warm') === '1',
    [],
  );
  const [progress, setProgress] = useState(wasWarm ? 100 : 6);
  const [ready, setReady] = useState(wasWarm);
  const [status, setStatus] = useState(wasWarm ? 'Ready' : 'Preparing the stadium');

  useEffect(() => {
    if (!canUseDom()) return;

    let cancelled = false;
    const started = performance.now();

    const registerWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // The application remains fully usable when service workers are unavailable.
      }
    };

    const warmApplication = async () => {
      if (wasWarm) {
        void registerWorker();
        return;
      }

      setStatus('Loading club data');
      let completed = 0;
      const tasks = warmers.map(async (load) => {
        try {
          await load();
        } finally {
          completed += 1;
          if (!cancelled) {
            setProgress(10 + Math.round((completed / warmers.length) * 82));
          }
        }
      });

      await Promise.allSettled([registerWorker(), ...tasks]);
      const remaining = Math.max(0, 780 - (performance.now() - started));
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      if (cancelled) return;

      setStatus('Kick-off ready');
      setProgress(100);
      window.sessionStorage.setItem('glfc:boot-warm', '1');
      window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 180);
    };

    void warmApplication();
    return () => {
      cancelled = true;
    };
  }, [wasWarm]);

  return (
    <>
      <div className={`boot-loader${ready ? ' is-ready' : ''}`} aria-hidden={ready}>
        <div className="boot-stadium-rings" />
        <div className="boot-content">
          <div className="boot-mark" aria-hidden="true">
            <span>GL</span>
            <i />
          </div>
          <h1>GOAL LEAGUE FC</h1>
          <p>{status}</p>
          <div className="boot-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}%</small>
        </div>
      </div>
      <div className={`boot-app${ready ? ' is-visible' : ''}`}>{ready ? children : null}</div>
    </>
  );
}
