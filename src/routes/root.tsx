import { useEffect } from 'react';
import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useGame, setNavBridge, type View } from '../store/gameStore';
import { BootLoader } from '../components/BootLoader';

const pathToView: Record<string, View> = {
  '/': 'menu',
  '/start-career': 'menu',
  '/hub': 'hub',
  '/squad': 'squad',
  '/transfers': 'transfers',
  '/training': 'training',
  '/table': 'table',
};

function viewFromPath(pathname: string): View | undefined {
  if (pathname.startsWith('/confirm-match/') || pathname.startsWith('/game/')) return 'match';
  return pathToView[pathname];
}

function RootComponent() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const view = useGame((state) => state.view);
  const nextFixture = useGame((state) => state.nextFixture);

  useEffect(() => {
    setNavBridge((path: string) => navigate({ to: path }));
    return () => setNavBridge(null);
  }, [navigate]);

  useEffect(() => {
    const nextView = viewFromPath(pathname);
    if (!nextView) return;
    const current = useGame.getState().view;
    if (nextView !== current) useGame.getState().syncViewFromRoute(nextView);
  }, [pathname]);

  useEffect(() => {
    const alreadyInMatchFlow = pathname.startsWith('/confirm-match/') || pathname.startsWith('/game/');
    if (view !== 'match' || alreadyInMatchFlow || !nextFixture) return;
    navigate({ to: '/confirm-match/$matchId', params: { matchId: nextFixture.id } });
  }, [navigate, nextFixture, pathname, view]);

  return (
    <BootLoader>
      <Outlet />
    </BootLoader>
  );
}

export const rootRoute = createRootRoute({ component: RootComponent });
