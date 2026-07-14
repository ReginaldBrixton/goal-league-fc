import { useMemo } from 'react';
import { useGame } from '../store/gameStore';
import './LeagueTable.css';

export function LeagueTable() {
  const table = useGame((state) => state.table);
  const teams = useGame((state) => state.teams);
  const userTeamId = useGame((state) => state.userTeamId);
  const round = useGame((state) => state.round);
  const season = useGame((state) => state.season);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const standings = useMemo(
    () => [...table].sort((a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.ga - b.ga ||
      (teamById.get(a.teamId)?.name ?? a.teamId).localeCompare(teamById.get(b.teamId)?.name ?? b.teamId),
    ),
    [table, teamById],
  );

  return (
    <div className="panel league-panel">
      <div className="league-heading">
        <h2>League Table — Season {season}</h2>
        <span className="muted">Round {round}</span>
      </div>
      <div className="table-scroll" role="region" aria-label="League standings" tabIndex={0}>
        <table className="league">
          <caption className="sr-only">League standings for season {season}, after round {round}</caption>
          <thead>
            <tr>
              <th scope="col">#</th><th scope="col">Team</th><th scope="col">P</th>
              <th scope="col">W</th><th scope="col">D</th><th scope="col">L</th>
              <th scope="col">GF</th><th scope="col">GA</th><th scope="col">GD</th><th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const team = teamById.get(row.teamId);
              const positionClass = index === 0 ? ' champion-place' : index < 3 ? ' top-place' : '';
              return (
                <tr
                  key={row.teamId}
                  className={`${row.teamId === userTeamId ? 'user-row' : ''}${positionClass}`}
                >
                  <td>{index + 1}</td>
                  <th scope="row" className="team-cell" title={team?.name ?? row.teamId}>
                    {team?.short ?? team?.name ?? row.teamId}
                  </th>
                  <td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td>
                  <td>{row.gf}</td><td>{row.ga}</td>
                  <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="pts">{row.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {standings.length === 0 && <p className="muted">No standings are available yet.</p>}
    </div>
  );
}