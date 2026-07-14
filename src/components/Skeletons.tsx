import '../styles/skeletons.css';

export function MenuSkeleton() {
  return (
    <main className="menu">
      <div className="sk-menu-hero">
        <div className="skeleton sk-menu-title" />
        <div className="skeleton sk-menu-sub" />
        <div className="sk-menu-btns">
          <div className="skeleton sk-menu-btn" />
          <div className="skeleton sk-menu-btn" />
        </div>
      </div>
    </main>
  );
}

export function CareerLayoutSkeleton() {
  return (
    <div className="app">
      <header className="sk-header">
        <div className="skeleton sk-brand" />
        <div className="sk-nav">
          <div className="skeleton sk-nav-item" />
          <div className="skeleton sk-nav-item" />
          <div className="skeleton sk-nav-item" />
          <div className="skeleton sk-nav-item" />
          <div className="skeleton sk-nav-item" />
        </div>
        <div className="skeleton sk-budget" />
        <div className="skeleton sk-save-btn" />
      </header>
      <main className="sk-content">
        <div className="sk-panel">
          <div className="skeleton sk-title" />
          <div className="skeleton sk-line" />
          <div className="skeleton sk-line medium" />
          <div className="skeleton sk-line short" />
        </div>
      </main>
    </div>
  );
}

export function HubSkeleton() {
  return (
    <div className="sk-content">
      <div className="sk-panel">
        <div className="skeleton sk-title" />
        <div className="sk-match-card">
          <div className="skeleton sk-team-badge" />
          <div className="skeleton sk-vs" />
          <div className="skeleton sk-team-badge" />
        </div>
      </div>
      <div className="sk-grid">
        <div className="sk-card">
          <div className="skeleton sk-title" />
          <div className="skeleton sk-line" />
          <div className="skeleton sk-line medium" />
          <div className="skeleton sk-line short" />
        </div>
        <div className="sk-card">
          <div className="skeleton sk-title" />
          <div className="skeleton sk-line" />
          <div className="skeleton sk-line medium" />
        </div>
      </div>
    </div>
  );
}

export function SquadSkeleton() {
  return (
    <div className="sk-content">
      <div className="sk-panel">
        <div className="skeleton sk-title" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="sk-row" key={i}>
            <div className="skeleton sk-badge" />
            <div className="skeleton sk-line medium" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransfersSkeleton() {
  return (
    <div className="sk-content">
      <div className="sk-panel">
        <div className="skeleton sk-title" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div className="sk-row" key={i}>
            <div className="skeleton sk-badge" />
            <div className="skeleton sk-line medium" />
            <div className="skeleton sk-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrainingSkeleton() {
  return (
    <div className="sk-content">
      <div className="sk-panel">
        <div className="skeleton sk-title" />
        {[1, 2, 3, 4].map((i) => (
          <div className="sk-row" key={i}>
            <div className="skeleton sk-badge" />
            <div className="skeleton sk-line medium" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="sk-content">
      <div className="sk-panel">
        <div className="skeleton sk-title" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div className="sk-table-row" key={i}>
            <div className="skeleton sk-table-cell" style={{ width: '24px' }} />
            <div className="skeleton sk-table-cell" style={{ width: '150px' }} />
            <div className="skeleton sk-table-cell" style={{ width: '40px' }} />
            <div className="skeleton sk-table-cell" style={{ width: '40px' }} />
            <div className="skeleton sk-table-cell" style={{ width: '40px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
