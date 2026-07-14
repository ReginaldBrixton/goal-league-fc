import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { SquadSkeleton } from '../components/Skeletons';
import { careerLayoutRoute } from './career-layout';

const SquadView = lazy(() => import('../components/SquadView').then((m) => ({ default: m.SquadView })));

export const squadRoute = createRoute({
  getParentRoute: () => careerLayoutRoute,
  path: '/squad',
  component: () => (
    <Suspense fallback={<SquadSkeleton />}>
      <SquadView />
    </Suspense>
  ),
});
