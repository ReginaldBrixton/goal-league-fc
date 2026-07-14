import { lazy, Suspense } from 'react';
import { createRoute } from '@tanstack/react-router';
import { HubSkeleton } from '../components/Skeletons';
import { careerLayoutRoute } from './career-layout';

const CareerHub = lazy(() => import('../components/CareerHub').then((m) => ({ default: m.CareerHub })));

export const hubRoute = createRoute({
  getParentRoute: () => careerLayoutRoute,
  path: '/hub',
  component: () => (
    <Suspense fallback={<HubSkeleton />}>
      <CareerHub />
    </Suspense>
  ),
});
