import type { Fixture, TableRow, Team } from '../types';

// Round-robin scheduler (circle method). Double round robin = home & away.
export function generateFixtures(teamIds: string[], double = true): Fixture[] {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) ids.push('BYE');
  const n = ids.length;
  const rounds = n - 1;
  const fixtures: Fixture[] = [];
  let fid = 1;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      if (a === 'BYE' || b === 'BYE') continue;
      // alternate home/away by round parity for fairness
      const home = r % 2 === 0 ? a : b;
      const away = r % 2 === 0 ? b : a;
      fixtures.push({
        id: `f${fid++}`,
        round: r + 1,
        homeId: home,
        awayId: away,
        played: false,
        homeGoals: null,
        awayGoals: null,
      });
    }
    // rotate (keep first fixed)
    const fixed = ids[0];
    const rest = ids.slice(1);
    rest.unshift(rest.pop() as string);
    ids.splice(0, ids.length, fixed, ...rest);
  }

  if (double) {
    const firstLeg = fixtures.map((f) => ({ ...f }));
    const secondLeg: Fixture[] = firstLeg.map((f) => ({
      id: `f${fid++}`,
      round: rounds + f.round,
      homeId: f.awayId,
      awayId: f.homeId,
      played: false,
      homeGoals: null,
      awayGoals: null,
    }));
    return [...firstLeg, ...secondLeg];
  }

  return fixtures;
}

export function emptyTable(teams: Team[]): TableRow[] {
  return teams.map((t) => ({
    teamId: t.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  }));
}

export function computeTable(teams: Team[], fixtures: Fixture[]): TableRow[] {
  const table = new Map<string, TableRow>(
    teams.map((t) => [t.id, { teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }]),
  );
  for (const f of fixtures) {
    if (!f.played || f.homeGoals === null || f.awayGoals === null) continue;
    const h = table.get(f.homeId);
    const a = table.get(f.awayId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += f.homeGoals; h.ga += f.awayGoals;
    a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.won++; h.pts += 3; a.lost++; }
    else if (f.homeGoals < f.awayGoals) { a.won++; a.pts += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  }
  return [...table.values()]
    .map((r) => ({ ...r, gd: r.gf - r.ga }))
    .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
}
