import { lazy, Suspense } from 'react';
import { createRoute, Outlet, Link, useLocation, redirect } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const MainMenu = lazy(() => import('../components/MainMenu').then((module) => ({ default: module.MainMenu })));

const NAV: { path: string; label: string }[] = [
  { path: '/hub', label: 'Hub' },
  { path: '/squad', label: 'Squad' },
  { path: '/transfers', label: 'Transfers' },
  { path: '/training', label: 'Training' },
  { path: '/table', label: 'Table' },
];

function ensureCareerLoaded(): boolean {
  const state = useGame.getState();
  return Boolean(state.userTeam) || state.continueCareer();
}

function CareerLayout() {
  const userTeam = useGame((state) => state.userTeam);
  const doSave = useGame((state) => state.doSave);
  const pathname = useLocation({ select: (location) => location.pathname });

  if (!userTeam) {
    return (
      <Suspense fallback={<MenuSkeleton />}>
        <MainMenu />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/hub" className="brand">
          <span className="brand-mark">GL</span>
          <span className="brand-text">Goal League FC</span>
        </Link>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-btn${pathname === item.path ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="top-right">
          <span className="budget-top">${(userTeam.budget / 1_000_000).toFixed(2)}M</span>
          <button className="btn small" onClick={() => doSave()}>Save</button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export const careerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'career',
  beforeLoad: () => {
    if (!ensureCareerLoaded()) throw redirect({ to: '/' });
  },
  component: CareerLayout,
});
