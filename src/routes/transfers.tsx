import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { TransfersSkeleton } from '../components/Skeletons';
import { careerLayoutRoute } from './career-layout';

const TransferMarket = lazy(() => import('../components/TransferMarket').then((m) => ({ default: m.TransferMarket })));

export const transfersRoute = createRoute({
  getParentRoute: () => careerLayoutRoute,
  path: '/transfers',
  component: () => (
    <Suspense fallback={<TransfersSkeleton />}>
      <TransferMarket />
    </Suspense>
  ),
});
