# Player Identity, Desktop Controls and Match Pace Design

## Goal

Make every generated footballer visually identifiable, give desktop players the requested keyboard layout, and increase the perceived speed of live matches without making tackles or ball control unstable.

## Player identity architecture

Each deterministic player ID from `p1` through `p232` receives its own appearance module under `src/data/playerAppearances/players/`. Every module exports a complete `PlayerAppearance` profile. The registry in `src/data/playerAppearances/index.ts` resolves these files by player ID and supplies a deterministic fallback for future IDs.

Profiles vary skin tone, hair colour and style, facial hair, face proportions, height, shoulder width, leg length, boots and one lightweight accessory. `PlayerModel` consumes the profile in both detailed cards and live matches. Match geometry remains deliberately low-poly and does not load external textures or models.

## Desktop controls

Arrow keys exclusively control movement. The action layout is:

- W: pass
- A: switch player
- S: tackle
- D: shoot

The mapping lives in a standalone input module so it can be unit tested. The live desktop match displays a compact keyboard guide; touch controls remain unchanged.

## Match pace

Player top speed and user acceleration increase moderately, with smaller increases to passing and shooting velocity. This speeds up movement and ball circulation while retaining existing tactical timing, collision handling and match duration.

## Testing

Regression tests verify all desktop key mappings, uniqueness and completeness of the 232 appearance profiles, deterministic fallback behaviour, and the new movement/ball pace constants. The existing tactical turnover, guided-pass, lint, build and browser playthrough suites must continue to pass on desktop, portrait mobile and landscape mobile.