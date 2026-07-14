import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { TableSkeleton } from '../components/Skeletons';
import { careerLayoutRoute } from './career-layout';

const LeagueTable = lazy(() => import('../components/LeagueTable').then((m) => ({ default: m.LeagueTable })));

export const tableRoute = createRoute({
  getParentRoute: () => careerLayoutRoute,
  path: '/table',
  component: () => (
    <Suspense fallback={<TableSkeleton />}>
      <LeagueTable />
    </Suspense>
  ),
});
