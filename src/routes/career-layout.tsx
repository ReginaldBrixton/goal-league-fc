import { lazy, Suspense } from 'react';
import { createRoute, Outlet, Link, useLocation, redirect } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const MainMenu = lazy(() => import('../components/MainMenu').then((m) => ({ default: m.MainMenu })));

const NAV: { path: string; label: string }[] = [
  { path: '/hub', label: 'Hub' },
  { path: '/squad', label: 'Squad' },
  { path: '/transfers', label: 'Transfers' },
  { path: '/training', label: 'Training' },
  { path: '/table', label: 'Table' },
];

function CareerLayout() {
  const userTeam = useGame((s) => s.userTeam);
  const doSave = useGame((s) => s.doSave);
  const pathname = useLocation({ select: (l) => l.pathname });

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
          {NAV.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={`nav-btn${pathname === n.path ? ' active' : ''}`}
            >
              {n.label}
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
    if (!useGame.getState().userTeam) {
      throw redirect({ to: '/' });
    }
  },
  component: CareerLayout,
});
