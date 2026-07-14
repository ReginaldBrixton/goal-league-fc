# Advanced Native Game Flow Design

## Objective

Transform Goal League FC into a fixed-viewport, responsive football game with a clear routed career journey, a distinctive visual identity on every major screen, a background-warming loading experience, and GPU-accelerated 3D match presentation.

## Routed Journey

1. `/` — cinematic landing dashboard and continue/new-career entry point.
2. `/start-career` — club-selection experience with live 3D kit preview.
3. `/hub` — compact career command centre with the next fixture and club operations.
4. `/confirm-match/$matchId` — fixture validation, lineup preview, and match settings.
5. `/game/$gameId` — full-screen live 3D gameplay.

Existing squad, transfers, training, and table routes remain available from the hub shell.

## Architecture

The existing Zustand career store and deterministic `MatchEngine` remain the simulation source of truth. A new React Three Fiber presentation layer reads the engine's mutable entity state without pushing per-frame state through React. DOM overlays remain responsible for the HUD, settings, pause menu, and touch controls.

The existing procedural `PlayerModel` is upgraded with more anatomical geometry, boots, hands, hair, facial detail, rounded kit geometry, jersey texture detail, and visible numbers. The live game scene renders all players, the ball, pitch, stadium geometry, shadows, and a broadcast camera.

## Loading and Caching

A boot loader dynamically imports the principal route and 3D modules while showing progress. A same-origin service worker uses stale-while-revalidate caching for static resources and navigation requests. TanStack Router intent preloading remains enabled. WebGL is configured for high-performance GPU preference, while mobile layouts reduce nonessential detail and UI density.

## Responsive Rules

Every core screen occupies `100dvh` and prevents document scrolling. Desktop uses a broadcast-style multi-panel layout. Tablet compresses navigation and secondary information. Mobile hides secondary panels, uses compact controls, safe-area insets, and game-style touch buttons while preserving the pitch as the dominant surface.

## Error Handling

Direct access to protected routes redirects to the landing screen when no career exists. Match routes validate the requested fixture ID and provide a safe return to the hub when the fixture is unavailable. WebGL and lazy-module loading have visible fallbacks.

## Verification

GitHub Actions will install dependencies, run lint and production build checks, launch the application, exercise the full route flow with Playwright, and capture desktop and mobile screenshots for all five major pages. Changes will merge to `master` only after the checks pass; Vercel's Git integration will then publish production.