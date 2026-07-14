import { useGame } from '../store/gameStore';
import { MatchView } from './MatchView';

export function MatchOverlay() {
  const view = useGame((s) => s.view);

  if (view !== 'match') return null;

  return (
    <div className="match-overlay" role="dialog" aria-modal="true" aria-label="Match">
      <MatchView />
    </div>
  );
}
