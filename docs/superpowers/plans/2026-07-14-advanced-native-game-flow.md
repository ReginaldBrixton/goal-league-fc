# Advanced Native Game Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a routed, fixed-viewport, responsive football career flow with background caching and live GPU-accelerated 3D gameplay.

**Architecture:** Retain Zustand and the existing `MatchEngine` as the domain/simulation layer. Add route-specific React components, a React Three Fiber live scene that reads engine entity state per frame, DOM HUD/touch controls, and a boot/service-worker cache layer.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Router, Zustand, Three.js, React Three Fiber, Drei, Playwright in GitHub Actions, Vercel.

## Global Constraints

- Core routes: `/`, `/start-career`, `/hub`, `/confirm-match/$matchId`, `/game/$gameId`.
- Core screens must fit `100dvh` without document scrolling.
- Desktop, tablet, and mobile layouts must preserve the game surface and hide or compact secondary UI.
- Match simulation must remain outside React render state.
- Players must visibly run, turn, wear team kits and numbers, and interact with the ball.
- Production deployment occurs only after lint, build, route-flow, and screenshot checks pass.

---

### Task 1: Routed career flow and boot cache

**Files:**
- Create: `src/components/BootLoader.tsx`
- Create: `src/components/StartCareer.tsx`
- Create: `src/routes/start-career.tsx`
- Create: `src/routes/confirm-match.tsx`
- Create: `src/routes/game.tsx`
- Modify: `src/routes/root.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/routeTree.ts`
- Create: `public/sw.js`

- [ ] Add a boot loader that preloads principal route, data, and Three.js modules and reports progress.
- [ ] Register stale-while-revalidate caching for same-origin GET requests.
- [ ] Make the landing screen route to the dedicated career selector.
- [ ] Add guarded dynamic match-confirmation and game routes.
- [ ] Remove global match-overlay routing from the root.
- [ ] Run `npm run build`; expect successful TypeScript and Vite output.
- [ ] Commit with `feat: add routed career flow and boot cache`.

### Task 2: Advanced landing and club selection

**Files:**
- Modify: `src/components/MainMenu.tsx`
- Create: `src/three/LandingScene3D.tsx`
- Create: `src/styles/advanced-flow.css`

- [ ] Build a cinematic full-viewport landing dashboard with a live 3D football scene.
- [ ] Build a full-viewport club-selection screen with crest, flag, colours, and a rotatable 3D kit preview.
- [ ] Add desktop, tablet, and mobile fixed-height layout rules.
- [ ] Run `npm run build`; expect success.
- [ ] Commit with `feat: redesign landing and career selection`.

### Task 3: Detailed procedural players

**Files:**
- Modify: `src/three/PlayerModel.tsx`
- Modify: `src/three/jerseyTexture.ts`

- [ ] Replace block-like anatomy with rounded torso, neck, shoulders, hands, thighs, shins, boots, hair, and facial details.
- [ ] Increase jersey texture resolution and add collar, striping, crest marks, and high-contrast numbering.
- [ ] Preserve cached textures and skeletal animation refs.
- [ ] Run `npm run build`; expect success.
- [ ] Commit with `feat: improve procedural 3d player detail`.

### Task 4: Match confirmation and live 3D game

**Files:**
- Create: `src/components/ConfirmMatchPage.tsx`
- Create: `src/components/GamePage.tsx`
- Create: `src/three/LiveMatch3D.tsx`

- [ ] Validate fixture IDs and assemble home/away best elevens.
- [ ] Add a unique 3D lineup preview and settings for difficulty, duration, camera, and graphics.
- [ ] Create the match engine once and update it inside the R3F frame loop.
- [ ] Render 22 animated players, a moving ball, pitch, stadium, broadcast camera, shadows, and active-player feedback.
- [ ] Add keyboard and touch controls, pause/resume, score HUD, events, and result recording.
- [ ] Navigate the confirmed fixture to `/game/$gameId` and return completed matches to `/hub`.
- [ ] Run `npm run build`; expect success.
- [ ] Commit with `feat: add live 3d routed match experience`.

### Task 5: Fixed-height hub and responsive native shell

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/styles/advanced-flow.css`

- [ ] Import final override styles after the existing design system.
- [ ] Convert the app shell and hub to fixed-height desktop/tablet/mobile compositions.
- [ ] Hide league and tertiary news information where viewport space is constrained.
- [ ] Keep controls keyboard accessible and respect reduced motion.
- [ ] Run `npm run lint` and `npm run build`; expect success.
- [ ] Commit with `style: finalize responsive native game shell`.

### Task 6: Automated route QA and screenshots

**Files:**
- Create: `scripts/capture-pages.mjs`
- Create: `.github/workflows/quality-and-screenshots.yml`

- [ ] Install Playwright Chromium in CI.
- [ ] Run lint and production build.
- [ ] Start Vite and exercise `/` → `/start-career` → `/hub` → `/confirm-match/$matchId` → `/game/$gameId`.
- [ ] Capture desktop 1440×900 and mobile 390×844 screenshots for each core page.
- [ ] Upload screenshots as a workflow artifact.
- [ ] Open a pull request, inspect checks and screenshots, and merge only after success.
- [ ] Confirm the Vercel production deployment reaches READY state.