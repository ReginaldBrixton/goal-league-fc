import { readFile, writeFile } from 'node:fs/promises';

async function load(path) {
  return readFile(path, 'utf8');
}

async function save(path, content) {
  await writeFile(path, content);
}

function replaceOrThrow(content, search, replacement, label) {
  if (!content.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return content.replace(search, replacement);
}

function replaceRegexOrThrow(content, pattern, replacement, label) {
  if (!pattern.test(content)) throw new Error(`Regex patch target not found: ${label}`);
  return content.replace(pattern, replacement);
}

async function patchGamePage() {
  const path = 'src/components/GamePage.tsx';
  let content = await load(path);
  content = replaceOrThrow(
    content,
    "import { usePressControls } from '../input/usePressControls';\n",
    "import { usePressControls } from '../input/usePressControls';\nimport { keyboardAction } from '../input/desktopControls';\n",
    'GamePage desktop control import',
  );
  content = replaceRegexOrThrow(
    content,
    /type KeyboardAction =[\s\S]*?function clampRating/,
    'function clampRating',
    'GamePage legacy keyboard mapper',
  );
  content = replaceOrThrow(
    content,
    '      <button type="button" className="game-pause-button" onClick={togglePause} aria-label="Pause match">Ⅱ</button>\n\n      <div className="game-touch-controls"',
    '      <button type="button" className="game-pause-button" onClick={togglePause} aria-label="Pause match">Ⅱ</button>\n\n      <div className="game-desktop-controls" aria-label="Desktop controls">\n        <span><kbd>↑↓←→</kbd> MOVE</span>\n        <span><kbd>W</kbd> PASS</span>\n        <span><kbd>A</kbd> SWITCH</span>\n        <span><kbd>S</kbd> TACKLE</span>\n        <span><kbd>D</kbd> SHOOT</span>\n      </div>\n\n      <div className="game-touch-controls"',
    'GamePage desktop legend',
  );
  await save(path, content);
}

async function patchGameControls() {
  const path = 'src/components/GameControls.css';
  let content = await load(path);
  if (!content.includes('.game-desktop-controls')) {
    content += `\n\n.game-desktop-controls {\n  position: fixed;\n  left: 50%;\n  bottom: 18px;\n  z-index: 18;\n  display: flex;\n  gap: 8px;\n  align-items: center;\n  padding: 8px 10px;\n  transform: translateX(-50%);\n  border: 1px solid rgba(255, 255, 255, 0.14);\n  border-radius: 12px;\n  background: rgba(4, 12, 18, 0.74);\n  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);\n  backdrop-filter: blur(12px);\n  pointer-events: none;\n}\n\n.game-desktop-controls span {\n  display: inline-flex;\n  gap: 5px;\n  align-items: center;\n  color: rgba(239, 248, 255, 0.78);\n  font-size: 9px;\n  font-weight: 800;\n  letter-spacing: 0.08em;\n}\n\n.game-desktop-controls kbd {\n  min-width: 24px;\n  padding: 4px 6px;\n  border: 1px solid rgba(255, 255, 255, 0.18);\n  border-bottom-color: rgba(255, 255, 255, 0.34);\n  border-radius: 6px;\n  background: rgba(255, 255, 255, 0.08);\n  color: #ffffff;\n  font: inherit;\n  text-align: center;\n}\n\n@media (max-width: 900px), (pointer: coarse) {\n  .game-desktop-controls {\n    display: none;\n  }\n}\n`;
  }
  await save(path, content);
}

async function patchPlayerModel() {
  const path = 'src/three/PlayerModel.tsx';
  let content = await load(path);
  content = replaceOrThrow(
    content,
    "import { makeJerseyTexture } from './jerseyTexture';\n",
    "import { makeJerseyTexture } from './jerseyTexture';\nimport { getPlayerAppearance } from '../data/playerAppearances';\nimport { MATCH_ANIMATION_RATE } from '../engine/matchPace';\n",
    'PlayerModel appearance imports',
  );
  content = replaceOrThrow(
    content,
    "  const detailed = variant === 'detail';\n  const segments = detailed ? 16 : 8;\n",
    "  const detailed = variant === 'detail';\n  const segments = detailed ? 16 : 8;\n  const appearance = useMemo(() => getPlayerAppearance(`p${Math.max(1, Math.round(number))}`), [number]);\n  const resolvedSkinColor = appearance.skinColor || skinColor;\n  const faceScale = useMemo<[number, number, number]>(() => {\n    const shape = appearance.faceShape === 'round'\n      ? [1.02, 0.98, 1.02]\n      : appearance.faceShape === 'oval'\n        ? [0.92, 1.08, 0.94]\n        : appearance.faceShape === 'wide'\n          ? [1.09, 0.96, 1.03]\n          : [0.95, 1.03, 0.91];\n    return [shape[0] * appearance.headScale, shape[1] * appearance.headScale, shape[2] * appearance.headScale];\n  }, [appearance.faceShape, appearance.headScale]);\n",
    'PlayerModel appearance setup',
  );
  content = replaceRegexOrThrow(
    content,
    /  const bootColor =[^\n]+\n  const hairColor =[^\n]+/,
    "  const bootColor = appearance.bootColor;\n  const hairColor = appearance.hairColor;",
    'PlayerModel derived colours',
  );
  content = replaceOrThrow(
    content,
    '    applyAnimation(boneRefs, animation, performance.now() / 1000);',
    "    applyAnimation(boneRefs, animation, performance.now() / 1000 * (variant === 'match' ? MATCH_ANIMATION_RATE : 1));",
    'PlayerModel animation speed',
  );
  content = replaceOrThrow(content, '<group ref={rootRef}>', '<group ref={rootRef} scale={[appearance.shoulderScale, appearance.heightScale, appearance.shoulderScale]}>', 'PlayerModel body proportions');
  content = content.replaceAll('color={skinColor}', 'color={resolvedSkinColor}');
  content = replaceOrThrow(content, 'scale={[0.92, 1.04, 0.9]}', 'scale={faceScale}', 'PlayerModel face proportions');
  content = replaceOrThrow(content, '<group ref={leftLegRef} position={[0.105, -0.45, 0]}>', '<group ref={leftLegRef} position={[0.105, -0.45, 0]} scale={[1, appearance.legScale, 1]}>', 'PlayerModel left leg proportions');
  content = replaceOrThrow(content, '<group ref={rightLegRef} position={[-0.105, -0.45, 0]}>', '<group ref={rightLegRef} position={[-0.105, -0.45, 0]} scale={[1, appearance.legScale, 1]}>', 'PlayerModel right leg proportions');
  content = replaceRegexOrThrow(
    content,
    /            <mesh position=\{\[0, 0\.098, -0\.004\]\} scale=\{\[0\.96, 0\.54, 0\.93\]\} castShadow=\{shadows\}>[\s\S]*?            <\/mesh>\n/,
    `            {appearance.hairStyle !== 'bald' && (\n              <mesh\n                position={[0, appearance.hairStyle === 'topknot' ? 0.115 : 0.098, -0.004]}\n                scale={appearance.hairStyle === 'fade'\n                  ? [0.98, 0.36, 0.94]\n                  : appearance.hairStyle === 'curls'\n                    ? [1.04, 0.66, 1]\n                    : appearance.hairStyle === 'mohawk'\n                      ? [0.72, 0.72, 0.64]\n                      : [0.96, 0.54, 0.93]}\n                castShadow={shadows}\n              >\n                <sphereGeometry args={[0.152, detailed ? 18 : 10, detailed ? 14 : 8, 0, Math.PI * 2, 0, Math.PI * 0.72]} />\n                <meshStandardMaterial color={hairColor} roughness={0.9} />\n              </mesh>\n            )}\n            {appearance.hairStyle === 'mohawk' && (\n              <mesh position={[0, 0.205, -0.012]} castShadow={shadows}>\n                <boxGeometry args={[0.055, 0.16, 0.19]} />\n                <meshStandardMaterial color={hairColor} roughness={0.88} />\n              </mesh>\n            )}\n            {appearance.hairStyle === 'topknot' && (\n              <mesh position={[0, 0.235, -0.015]} castShadow={shadows}>\n                <sphereGeometry args={[0.055, detailed ? 12 : 8, detailed ? 10 : 6]} />\n                <meshStandardMaterial color={hairColor} roughness={0.88} />\n              </mesh>\n            )}\n            {appearance.accessory === 'headband' && (\n              <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>\n                <torusGeometry args={[0.14, 0.012, 6, detailed ? 24 : 12]} />\n                <meshStandardMaterial color={appearance.accessoryColor} roughness={0.55} />\n              </mesh>\n            )}\n`,
    'PlayerModel hair styles',
  );
  content = replaceOrThrow(
    content,
    '            {detailed && (\n              <>',
    `            {detailed && appearance.facialHair !== 'none' && (\n              <mesh\n                position={[0, -0.095, 0.105]}\n                scale={appearance.facialHair === 'beard' ? [1.05, 0.7, 0.42] : appearance.facialHair === 'goatee' ? [0.48, 0.62, 0.32] : [0.9, 0.32, 0.28]}\n              >\n                <sphereGeometry args={[0.075, 12, 8]} />\n                <meshStandardMaterial color={hairColor} roughness={0.95} />\n              </mesh>\n            )}\n\n            {detailed && (\n              <>`,
    'PlayerModel facial hair',
  );
  content = replaceOrThrow(
    content,
    '              <mesh position={[0, -0.22, 0.008]} castShadow={shadows}>',
    `              {(appearance.accessory === 'left-wristband' || appearance.accessory === 'arm-sleeve') && (\n                <mesh position={[0, -0.16, 0.004]} rotation={[Math.PI / 2, 0, 0]}>\n                  <torusGeometry args={[0.047, appearance.accessory === 'arm-sleeve' ? 0.025 : 0.012, 6, 14]} />\n                  <meshStandardMaterial color={appearance.accessoryColor} roughness={0.62} />\n                </mesh>\n              )}\n              <mesh position={[0, -0.22, 0.008]} castShadow={shadows}>`,
    'PlayerModel left accessory',
  );
  const firstRight = content.indexOf('              <mesh position={[0, -0.22, 0.008]} castShadow={shadows}>', content.indexOf("appearance.accessory === 'left-wristband'"));
  const secondRight = content.indexOf('              <mesh position={[0, -0.22, 0.008]} castShadow={shadows}>', firstRight + 1);
  if (secondRight < 0) throw new Error('Patch target not found: PlayerModel right accessory');
  content = `${content.slice(0, secondRight)}              {(appearance.accessory === 'right-wristband') && (\n                <mesh position={[0, -0.16, 0.004]} rotation={[Math.PI / 2, 0, 0]}>\n                  <torusGeometry args={[0.047, 0.012, 6, 14]} />\n                  <meshStandardMaterial color={appearance.accessoryColor} roughness={0.62} />\n                </mesh>\n              )}\n${content.slice(secondRight)}`;
  await save(path, content);
}

async function patchPlayerSurfaces() {
  const cardPath = 'src/three/Player3DCard.tsx';
  let card = await load(cardPath);
  card = replaceOrThrow(card, 'number={player.rating}', "number={Number(player.id.replace(/\\D/g, '').slice(-3)) || player.rating}", 'Player3DCard visual number');
  await save(cardPath, card);

  const previewPath = 'src/three/MatchPreview3D.tsx';
  let preview = await load(previewPath);
  preview = replaceOrThrow(preview, 'number={index + 1}', "number={Number(player.id.replace(/\\D/g, '').slice(-3)) || index + 1}", 'MatchPreview player identity');
  await save(previewPath, preview);
}

async function patchMatchPace() {
  const enginePath = 'src/engine/matchEngine.ts';
  let engine = await load(enginePath);
  engine = replaceOrThrow(
    engine,
    "import { formationPositions } from '../data/formations';\n",
    "import { formationPositions } from '../data/formations';\nimport { PASS_SPEED_MULTIPLIER, SHOT_SPEED_MULTIPLIER, USER_ACCELERATION, playerTopSpeed } from './matchPace';\n",
    'MatchEngine pace import',
  );
  engine = replaceOrThrow(engine, 'const acceleration = clamp(dt * 14, 0, 1);', 'const acceleration = clamp(dt * USER_ACCELERATION, 0, 1);', 'MatchEngine acceleration');
  engine = replaceOrThrow(engine, 'const power = clamp(13 + passDistance * 0.35 + passing / 14, 14, 28);', 'const power = clamp(13 + passDistance * 0.35 + passing / 14, 14, 28) * PASS_SPEED_MULTIPLIER;', 'MatchEngine pass pace');
  engine = replaceOrThrow(engine, 'const power = clamp(24 + shooting / 5 + Math.min(distanceToGoal, 35) * 0.12, 27, 44);', 'const power = clamp(24 + shooting / 5 + Math.min(distanceToGoal, 35) * 0.12, 27, 44) * SHOT_SPEED_MULTIPLIER;', 'MatchEngine shot pace');
  engine = replaceOrThrow(engine, '    return 5.8 + clamp(player.pace, 20, 99) / 99 * 3.2;', '    return playerTopSpeed(player.pace);', 'MatchEngine top speed');
  await save(enginePath, engine);

  const strategicPath = 'src/engine/strategicMatchEngine.ts';
  let strategic = await load(strategicPath);
  strategic = replaceOrThrow(
    strategic,
    "import { integrateControlledVelocity, resolveControlledMovement } from './playerMovement';\n",
    "import { integrateControlledVelocity, resolveControlledMovement } from './playerMovement';\nimport { PASS_SPEED_MULTIPLIER } from './matchPace';\n",
    'Strategic engine pace import',
  );
  strategic = replaceOrThrow(strategic, 'const power = clamp(13 + passDistance * 0.35 + passing / 14, 14, 28);', 'const power = clamp(13 + passDistance * 0.35 + passing / 14, 14, 28) * PASS_SPEED_MULTIPLIER;', 'Strategic pass pace');
  await save(strategicPath, strategic);
}

async function patchBrowserPlaytest() {
  const path = 'scripts/capture-pages.mjs';
  let content = await load(path);
  if (!content.includes('Desktop keyboard evidence:')) {
    content = replaceOrThrow(
      content,
      'async function captureDesktop() {',
      `async function verifyDesktopKeyboard(page) {\n  const checks = [\n    ['ArrowRight', 'right'],\n    ['ArrowUp', 'up'],\n    ['w', 'pass'],\n    ['a', 'switchPlayer'],\n    ['s', 'slide'],\n    ['d', 'shoot'],\n  ];\n\n  for (const [key, action] of checks) {\n    await page.keyboard.down(key);\n    await page.waitForFunction(\n      (name) => Boolean(window.__goalLeagueDebug?.input()[name]),\n      action,\n      { timeout: 2_000 },\n    );\n    await page.keyboard.up(key);\n    await page.waitForFunction(\n      (name) => !window.__goalLeagueDebug?.input()[name],\n      action,\n      { timeout: 2_000 },\n    );\n  }\n  console.log('Desktop keyboard evidence: arrows=movement W=pass A=switch S=tackle D=shoot');\n}\n\nasync function captureDesktop() {`,
      'Desktop keyboard helper',
    );
    content = replaceOrThrow(
      content,
      '  await assertGameplayLayout(page);\n  await page.screenshot({ path: `${screenshotDir}/05-game-desktop.png`',
      '  await assertGameplayLayout(page);\n  await verifyDesktopKeyboard(page);\n  await page.screenshot({ path: `${screenshotDir}/05-game-desktop.png`',
      'Desktop keyboard playtest call',
    );
  }
  await save(path, content);
}

async function patchDesignDocs() {
  const path = 'docs/superpowers/specs/2026-07-17-player-identity-controls-pace-design.md';
  let content = await load(path);
  content = content.replace(
    'Each deterministic player ID from `p1` through `p232` receives its own appearance module under `src/data/playerAppearances/players/`. Every module exports a complete `PlayerAppearance` profile.',
    'Each deterministic player ID from `p1` through `p232` receives its own complete `PlayerAppearance` profile. The profiles are organised across multiple focused player-range modules under `src/data/playerAppearances/players/` so the data remains independent without creating one oversized registry file.',
  );
  await save(path, content);
}

await patchGamePage();
await patchGameControls();
await patchPlayerModel();
await patchPlayerSurfaces();
await patchMatchPace();
await patchBrowserPlaytest();
await patchDesignDocs();
console.log('Player identity, desktop controls and gameplay pace patches applied.');
