// Core domain types for Goal League FC

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number;       // overall 1-99
  potential: number;    // ceiling for development
  pace: number;         // 1-99
  passing: number;      // 1-99
  shooting: number;     // 1-99
  defending: number;    // 1-99
  value: number;        // market value in currency units
  wage: number;         // per-match wage
  teamId: string | null; // null = free agent
  goals: number;        // season stats
  apps: number;         // appearances this season
}

export type FormationKey = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2';

export interface Formation {
  key: FormationKey;
  name: string;
  // distribution of outfield players by line
  lines: { def: number; mid: number; fwd: number };
}

export interface Team {
  id: string;
  name: string;
  short: string;        // 3-letter abbreviation
  color: string;        // primary kit color
  color2: string;       // secondary kit color
  budget: number;       // transfer funds
  isUser: boolean;
}

export interface Fixture {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  played: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'own-goal' | 'yellow' | 'sub';
  teamId: string;
  playerName: string;
  text: string;
}

export interface MatchResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  homeShots: number;
  awayShots: number;
  scorers: { playerId: string; name: string; teamId: string; minute: number }[];
}

export interface SavedGame {
  version: number;
  savedAt: number;
  state: SerializableState;
}

// Everything we persist between sessions
export interface SerializableState {
  userTeamId: string;
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  round: number;          // next round to play (1-indexed)
  season: number;
  freeAgents: Player[];
  trainingFocus: Record<string, TrainingFocus>; // keyed by playerId
  log: string[];          // recent news headlines
}

export type TrainingFocus = 'attacking' | 'defending' | 'fitness' | 'balanced';

export interface LeagueInfo {
  name: string;
  teamCount: number;
  rounds: number; // total rounds (double round robin = (n-1)*2)
}
