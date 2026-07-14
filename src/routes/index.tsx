import { lazy, Suspense } from 'react';
import { createRoute, redirect } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const MainMenu = lazy(() => import('../components/MainMenu').then((m) => ({ default: m.MainMenu })));

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    if (useGame.getState().userTeam) {
      throw redirect({ to: '/hub' });
    }
  },
  component: () => (
    <Suspense fallback={<MenuSkeleton />}>
      <MainMenu />
    </Suspense>
  ),
});
