# Player Identity, Desktop Controls and Match Pace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every generated player an independent visual profile, remap desktop gameplay to arrow movement plus W/A/S/D actions, and make matches feel faster.

**Architecture:** Add a typed player-appearance registry backed by one module per deterministic player ID, then consume it in every real-player 3D surface. Isolate desktop key mapping and pace calculations in pure modules so they can be tested without React or WebGL.

**Tech Stack:** TypeScript 6, React 19, Three.js, React Three Fiber, Node test runner through `tsx --test`, Vite.

## Global Constraints

- Arrow keys are the only desktop movement keys.
- W passes, A switches player, S tackles, and D shoots.
- Touch controls and tactical turnover behaviour must not regress.
- Player variation must remain deterministic and lightweight on mobile.
- Existing production match duration remains unchanged.

---

### Task 1: Desktop keyboard mapping

**Files:**
- Create: `src/input/desktopControls.ts`
- Modify: `src/components/GamePage.tsx`
- Modify: `src/components/GameControls.css`
- Test: `tests/desktopControls.test.ts`

- [ ] Write a failing test asserting ArrowUp/Down/Left/Right map to movement and KeyW/KeyA/KeyS/KeyD map to pass/switchPlayer/slide/shoot.
- [ ] Implement `keyboardAction(code: string): KeyboardAction | null` in `desktopControls.ts`.
- [ ] Replace the local GamePage mapper with the shared function and add a desktop-only control legend.
- [ ] Run `npm test` and confirm the mapping test passes.

### Task 2: Independent player appearance files

**Files:**
- Create: `src/data/playerAppearances/types.ts`
- Create: `src/data/playerAppearances/index.ts`
- Create: `src/data/playerAppearances/players/p1.ts` through `p232.ts`
- Modify: `src/three/PlayerModel.tsx`
- Modify: `src/three/LiveMatch3D.tsx`
- Modify: `src/three/Player3DCard.tsx`
- Modify: `src/three/MatchPreview3D.tsx`
- Test: `tests/playerAppearances.test.ts`

- [ ] Write a failing test that resolves all 232 profiles, verifies deterministic fallback output, and requires unique visual signatures.
- [ ] Add the typed registry and individual player modules.
- [ ] Extend `PlayerModel` with body proportions, face shape, hair styles, facial hair, boots and lightweight accessories.
- [ ] Pass the resolved appearance to live matches, player cards and match previews.
- [ ] Run `npm test` and confirm appearance tests pass.

### Task 3: Faster gameplay pace

**Files:**
- Create: `src/engine/matchPace.ts`
- Modify: `src/engine/matchEngine.ts`
- Modify: `src/three/LiveMatch3D.tsx`
- Modify: `src/three/PlayerModel.tsx`
- Test: `tests/gameplayPace.test.ts`

- [ ] Write a failing test for the new top-speed curve, pass speed multiplier, shot multiplier and animation rate.
- [ ] Implement pace constants and pure `playerTopSpeed` calculation.
- [ ] Use the new speed curve, faster acceleration, slightly faster passes/shots and match-only animation rate.
- [ ] Run `npm test` and confirm pace and tactical regressions pass.

### Task 4: Full verification and release

**Files:**
- Modify browser capture script only when necessary to assert desktop key actions and preserve screenshots.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run the GitHub Actions desktop, portrait and landscape gameplay journey.
- [ ] Review player identity and keyboard evidence screenshots.
- [ ] Merge the pull request and verify both production domains return the new build.