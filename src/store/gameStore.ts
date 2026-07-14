import { create } from 'zustand';
import type {
  Fixture, MatchResult, Player, SerializableState, Team, TrainingFocus,
} from '../types';
import { generateTeamsAndSquads } from '../data/teams';
import { computeTable, emptyTable, generateFixtures } from '../data/leagues';
import { ageAndDecline, trainPlayer } from '../engine/playerDev';
import { Rng } from '../utils/rng';
import { loadGame, saveGame } from '../utils/storage';

export type View = 'menu' | 'hub' | 'squad' | 'transfers' | 'table' | 'training' | 'match';

let navBridge: ((path: string) => void) | null = null;
export function setNavBridge(fn: ((path: string) => void) | null) { navBridge = fn; }

const viewToPath: Partial<Record<View, string>> = {
  menu: '/',
  hub: '/hub',
  squad: '/squad',
  transfers: '/transfers',
  training: '/training',
  table: '/table',
};

interface GameState extends SerializableState {
  view: View;
  table: ReturnType<typeof computeTable>;
  userTeam: Team | null;
  nextFixture: Fixture | null;
  pendingResult: MatchResult | null;
  // actions
  newCareer: (teamIndex: number) => void;
  continueCareer: () => boolean;
  setView: (v: View) => void;
  syncViewFromRoute: (v: View) => void;
  recordSimResult: (fixtureId: string, result: MatchResult) => void;
  train: (playerId: string) => void;
  setTrainingFocus: (playerId: string, focus: TrainingFocus) => void;
  buyPlayer: (playerId: string) => boolean;
  sellPlayer: (playerId: string) => boolean;
  advanceSeason: () => void;
  doSave: () => boolean;
  log: string[];
  pushLog: (msg: string) => void;
}

const TEAM_COUNT = 8;

function buildInitialState(): Pick<GameState, 'teams' | 'players' | 'freeAgents' | 'fixtures' | 'round' | 'season' | 'trainingFocus' | 'log' | 'userTeamId'> {
  return {
    teams: [], players: [], freeAgents: [], fixtures: [], round: 1, season: 1, trainingFocus: {}, log: [],
    userTeamId: '',
  };
}

export const useGame = create<GameState>((set, get) => ({
  ...buildInitialState(),
  view: 'menu',
  table: [],
  userTeam: null,
  nextFixture: null,
  pendingResult: null,

  newCareer: (teamIndex: number) => {
    const seed = (Date.now() & 0xffff) ^ Math.floor(Math.random() * 1e6);
    const { teams, players, freeAgents } = generateTeamsAndSquads(seed, TEAM_COUNT);
    // mark chosen team as user
    const idx = Math.max(0, Math.min(teams.length - 1, teamIndex));
    teams[idx] = { ...teams[idx], isUser: true, budget: 5_000_000 };
    const teamIds = teams.map((t) => t.id);
    const fixtures = generateFixtures(teamIds, true);
    const table = emptyTable(teams);
    const userTeam = teams[idx];
    const nextFixture = fixtures
      .filter((f) => f.round === 1 && (f.homeId === userTeam.id || f.awayId === userTeam.id))[0] ?? null;
    set({
      userTeamId: userTeam.id,
      teams, players, freeAgents, fixtures, round: 1, season: 1, trainingFocus: {}, log: [],
      table, userTeam, nextFixture, pendingResult: null, view: 'hub',
    });
    get().pushLog(`New career started as ${userTeam.name}.`);
    get().doSave();
    if (navBridge) navBridge('/hub');
  },

  continueCareer: () => {
    const save = loadGame();
    if (!save) return false;
    const s = save.state;
    const userTeam = s.teams.find((t) => t.isUser) ?? null;
    const table = computeTable(s.teams, s.fixtures);
    const nextFixture = nextUserFixture(s.fixtures, s.round, userTeam?.id ?? null);
    set({ ...s, userTeamId: userTeam?.id ?? '', view: 'hub', table, userTeam, nextFixture, pendingResult: null });
    if (navBridge) navBridge('/hub');
    return true;
  },

  setView: (v) => {
    set({ view: v });
    if (v !== 'match' && navBridge) {
      const path = viewToPath[v];
      if (path) navBridge(path);
    }
  },

  syncViewFromRoute: (v) => set({ view: v }),

  recordSimResult: (fixtureId, result) => {
    const state = get();
    const fixtures = state.fixtures.map((f) =>
      f.id === fixtureId ? { ...f, played: true, homeGoals: result.homeGoals, awayGoals: result.awayGoals } : f,
    );
    // update player season stats (goals/apps) for both teams' scorers
    const players = state.players.map((p) => ({ ...p }));
    const freeAgents = state.freeAgents.map((p) => ({ ...p }));
    const allRoster = [...players, ...freeAgents];
    const bump = (id: string) => {
      const p = allRoster.find((x) => x.id === id);
      if (p) p.goals++;
    };
    for (const sc of result.scorers) bump(sc.playerId);
    // appearances for the two teams involved
    const homeTeam = state.teams.find((t) => t.id === result.homeId);
    const awayTeam = state.teams.find((t) => t.id === result.awayId);
    void homeTeam; void awayTeam;
    for (const p of players) {
      if (p.teamId === result.homeId || p.teamId === result.awayId) p.apps++;
    }

    const table = computeTable(state.teams, fixtures);
    // wages for user team
    let budget = state.userTeam?.budget ?? 0;
    const userTeamId = state.userTeam?.id ?? null;
    if (userTeamId) {
      const userPlayers = players.filter((p) => p.teamId === userTeamId);
      const wages = userPlayers.reduce((s, p) => s + p.wage, 0);
      budget -= wages;
      // prize money for user match
      const userFixture = fixtures.find((f) => f.id === fixtureId && (f.homeId === userTeamId || f.awayId === userTeamId));
      if (userFixture) {
        const isHome = userFixture.homeId === userTeamId;
        const ug = isHome ? result.homeGoals : result.awayGoals;
        const og = isHome ? result.awayGoals : result.homeGoals;
        let prize = 50_000; // appearance
        if (ug > og) prize += 150_000;
        else if (ug === og) prize += 50_000;
        budget += prize;
        const log = [...state.log];
        log.unshift(
          `Match ${isHome ? 'H' : 'A'}: ${ug}-${og}. ${ug > og ? 'Win! +$150k' : ug === og ? 'Draw. +$50k' : 'Loss.'} (wages -$${wages.toLocaleString()})`,
        );
        set({ teams: state.teams.map((t) => t.id === userTeamId ? { ...t, budget } : t), userTeam: state.userTeam ? { ...state.userTeam, budget } : null, log: log.slice(0, 30) });
      }
    }

    // advance round if all fixtures in current round played
    const round = state.round;
    const roundDone = fixtures.filter((f) => f.round === round).every((f) => f.played);
    let nextRound = round;
    if (roundDone) nextRound = round + 1;
    const nextFixture = nextUserFixture(fixtures, nextRound, userTeamId);

    set({ fixtures, players, freeAgents, table, round: nextRound, nextFixture, pendingResult: result });
    get().doSave();
  },

  train: (playerId) => {
    const state = get();
    const rng = new Rng(Date.now() & 0xffffff);
    const focus = state.trainingFocus[playerId] ?? 'balanced';
    const update = (arr: Player[]) => arr.map((p) => p.id === playerId ? trainPlayer(p, focus, rng) : p);
    const players = update(state.players);
    const freeAgents = update(state.freeAgents);
    set({ players, freeAgents });
    get().doSave();
  },

  setTrainingFocus: (playerId, focus) => {
    set({ trainingFocus: { ...get().trainingFocus, [playerId]: focus } });
    get().doSave();
  },

  buyPlayer: (playerId) => {
    const state = get();
    const userTeamId = state.userTeam?.id ?? null;
    if (!userTeamId) return false;
    const fa = state.freeAgents.find((p) => p.id === playerId);
    if (!fa) return false;
    const userTeam = state.teams.find((t) => t.id === userTeamId)!;
    if (userTeam.budget < fa.value) return false;
    const budget = userTeam.budget - fa.value;
    const moved: Player = { ...fa, teamId: userTeamId };
    const freeAgents = state.freeAgents.filter((p) => p.id !== playerId);
    const players = [...state.players, moved];
    const teams = state.teams.map((t) => t.id === userTeamId ? { ...t, budget } : t);
    set({
      players, freeAgents, teams,
      userTeam: { ...userTeam, budget },
    });
    get().pushLog(`Signed ${moved.name} (${moved.position}, OVR ${moved.rating}) for $${moved.value.toLocaleString()}.`);
    get().doSave();
    return true;
  },

  sellPlayer: (playerId) => {
    const state = get();
    const userTeamId = state.userTeam?.id ?? null;
    if (!userTeamId) return false;
    const p = state.players.find((x) => x.id === playerId && x.teamId === userTeamId);
    if (!p) return false;
    // keep at least 11 players
    const squadSize = state.players.filter((x) => x.teamId === userTeamId).length;
    if (squadSize <= 14) return false;
    const proceeds = Math.round(p.value * 0.9);
    const userTeam = state.teams.find((t) => t.id === userTeamId)!;
    const budget = userTeam.budget + proceeds;
    const players = state.players.filter((x) => x.id !== playerId);
    const freeAgents = [...state.freeAgents, { ...p, teamId: null }];
    const teams = state.teams.map((t) => t.id === userTeamId ? { ...t, budget } : t);
    set({ players, freeAgents, teams, userTeam: { ...userTeam, budget } });
    get().pushLog(`Sold ${p.name} for $${proceeds.toLocaleString()}.`);
    get().doSave();
    return true;
  },

  advanceSeason: () => {
    const state = get();
    const rng = new Rng(Date.now() & 0xffffff);
    // age all players
    const players = state.players.map((p) => ageAndDecline(p, rng));
    const freeAgents = state.freeAgents.map((p) => ageAndDecline(p, rng));
    // reset season stats
    const resetStats = (arr: Player[]) => arr.map((p) => ({ ...p, goals: 0, apps: 0 }));
    const fixtures = generateFixtures(state.teams.map((t) => t.id), true);
    const table = emptyTable(state.teams);
    const userTeam = state.teams.find((t) => t.isUser) ?? state.userTeam;
    const nextFixture = nextUserFixture(fixtures, 1, userTeam?.id ?? null);
    set({
      players: resetStats(players), freeAgents: resetStats(freeAgents),
      fixtures, table, round: 1, season: state.season + 1, nextFixture, pendingResult: null,
    });
    get().pushLog(`Season ${state.season + 1} begins!`);
    get().doSave();
  },

  doSave: () => {
    const s = get();
    const state: SerializableState = {
      userTeamId: s.userTeamId,
      teams: s.teams,
      players: s.players,
      fixtures: s.fixtures,
      round: s.round,
      season: s.season,
      freeAgents: s.freeAgents,
      trainingFocus: s.trainingFocus,
      log: s.log,
    };
    return saveGame({ version: 1, savedAt: Date.now(), state });
  },

  pushLog: (msg) => {
    set({ log: [msg, ...get().log].slice(0, 30) });
  },
}));

function nextUserFixture(fixtures: Fixture[], round: number, userTeamId: string | null): Fixture | null {
  if (!userTeamId) return null;
  for (let r = round; r <= 99; r++) {
    const f = fixtures.find((fx) => fx.round === r && !fx.played && (fx.homeId === userTeamId || fx.awayId === userTeamId));
    if (f) return f;
  }
  return null;
}
