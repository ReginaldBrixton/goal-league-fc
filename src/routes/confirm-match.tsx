import { lazy, Suspense } from 'react';
import { createRoute, redirect } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const ConfirmMatchPage = lazy(() => import('../components/ConfirmMatchPage').then((module) => ({ default: module.ConfirmMatchPage })));

function ConfirmMatchRouteComponent() {
  const { matchId } = confirmMatchRoute.useParams();
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <ConfirmMatchPage matchId={matchId} />
    </Suspense>
  );
}

export const confirmMatchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirm-match/$matchId',
  beforeLoad: () => {
    if (!useGame.getState().userTeam) throw redirect({ to: '/' });
  },
  component: ConfirmMatchRouteComponent,
});
