import { useGame, type View } from './store/gameStore';
import { MainMenu } from './components/MainMenu';
import { CareerHub } from './components/CareerHub';
import { SquadView } from './components/SquadView';
import { TransferMarket } from './components/TransferMarket';
import { LeagueTable } from './components/LeagueTable';
import { TrainingView } from './components/TrainingView';
import { MatchView } from './components/MatchView';
import './styles/global.css';

const NAV: { key: View; label: string }[] = [
  { key: 'hub', label: 'Hub' },
  { key: 'squad', label: 'Squad' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'training', label: 'Training' },
  { key: 'table', label: 'Table' },
];

function App() {
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);
  const userTeam = useGame((s) => s.userTeam);
  const doSave = useGame((s) => s.doSave);

  if (view === 'menu' || !userTeam) {
    return (
      <div className="app">
        <MainMenu />
      </div>
    );
  }

  const inMatch = view === 'match';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView('hub')}>
          <span className="brand-mark">GL</span>
          <span className="brand-text">Goal League FC</span>
        </div>
        {!inMatch && (
          <nav className="nav">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={`nav-btn${view === n.key ? ' active' : ''}`}
                onClick={() => setView(n.key)}
              >{n.label}</button>
            ))}
          </nav>
        )}
        <div className="top-right">
          <span className="budget-top">${(userTeam.budget / 1_000_000).toFixed(2)}M</span>
          <button className="btn small" onClick={() => doSave()}>Save</button>
        </div>
      </header>

      <main className="content">
        {view === 'hub' && <CareerHub />}
        {view === 'squad' && <SquadView />}
        {view === 'transfers' && <TransferMarket />}
        {view === 'training' && <TrainingView />}
        {view === 'table' && <LeagueTable />}
        {view === 'match' && <MatchView />}
      </main>
    </div>
  );
}

export default App;
