import { lazy, Suspense } from 'react';
import { createRoute, redirect } from '@tanstack/react-router';
import { useGame } from '../store/gameStore';
import { MenuSkeleton } from '../components/Skeletons';
import { rootRoute } from './root';

const GamePage = lazy(() => import('../components/GamePage').then((module) => ({ default: module.GamePage })));

function GameRouteComponent() {
  const { gameId } = gameRoute.useParams();
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <GamePage gameId={gameId} />
    </Suspense>
  );
}

export const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game/$gameId',
  beforeLoad: () => {
    if (!useGame.getState().userTeam) throw redirect({ to: '/' });
  },
  component: GameRouteComponent,
});
