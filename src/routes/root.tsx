import { useEffect } from 'react';
import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useGame, setNavBridge, type View } from '../store/gameStore';
import { MatchOverlay } from '../components/MatchOverlay';

const pathToView: Record<string, View> = {
  '/': 'menu',
  '/hub': 'hub',
  '/squad': 'squad',
  '/transfers': 'transfers',
  '/training': 'training',
  '/table': 'table',
};

function RootComponent() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });

  useEffect(() => {
    setNavBridge((path: string) => navigate({ to: path }));
    return () => setNavBridge(null);
  }, [navigate]);

  useEffect(() => {
    const newView = pathToView[pathname];
    if (newView) {
      const current = useGame.getState().view;
      if (newView !== current) {
        useGame.getState().syncViewFromRoute(newView);
      }
    }
  }, [pathname]);

  return (
    <>
      <Outlet />
      <MatchOverlay />
    </>
  );
}

export const rootRoute = createRootRoute({ component: RootComponent });
