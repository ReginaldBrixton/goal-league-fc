# Goal League FC

A React + TypeScript football game inspired by Dream League Football and FC 26.
Playable 2D top-down match (with quick-sim option), team management, transfer
market, league/career mode, and player development. Client-side only; saves to
localStorage.

## Commands

> Note: on this machine PowerShell script execution is disabled, so `npm`/`npx`
> must be invoked as `npm.cmd` / `npx.cmd`.

- `npm.cmd run dev` — start Vite dev server (default http://localhost:5173)
- `npm.cmd run build` — type-check (`tsc -b`) then `vite build` into `dist/`
- `npm.cmd run preview` — preview the production build
- `npm.cmd run lint` — run oxlint

## Tech

- Vite + React 19 + TypeScript
- Zustand for state (`src/store/gameStore.ts`)
- HTML Canvas for the match (`src/engine/matchEngine.ts`)
- localStorage for saves (`src/utils/storage.ts`)

## Architecture

- `src/types/index.ts` — domain types (Player, Team, Fixture, etc.)
- `src/data/` — generators for clubs, squads, fixtures, formations
- `src/engine/` — match engine (playable), quick sim, player development
- `src/store/gameStore.ts` — Zustand store with all career actions + save/load
- `src/components/` — UI screens (MainMenu, CareerHub, SquadView,
  TransferMarket, TrainingView, LeagueTable, MatchView, PlayerCard)

## Match controls (when playing)

- Arrow keys / WASD — move active player
- J or Space — pass
- K — shoot
- L — slide/tackle (steal the ball from opponents)
- Shift or Q — switch active player (nearest to ball)

## Notes

- All club and player names are fictional.
- The match engine uses a 4-3-3 best-XI for both teams regardless of the
  formation selected in Squad view (formation selection is cosmetic for now).
- The Squad view formation picker is a display/tactic preview; extending it to
  drive the match engine is a good next step.
