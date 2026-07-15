import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = 'screenshots';
const videoDir = 'videos';

await mkdir(screenshotDir, { recursive: true });
await mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});

async function assertGameplayLayout(page) {
  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      canvas: rect('.live-match-canvas canvas'),
      scorebar: rect('.game-scorebar'),
      controls: rect('.game-touch-controls'),
      joystick: rect('.game-joystick'),
    };
  });

  assert.ok(layout.canvas, 'live canvas must exist');
  assert.ok(layout.scorebar, 'scorebar must exist');
  assert.ok(layout.controls, 'touch controls must exist');
  assert.ok(layout.joystick, 'analogue joystick must exist');
  assert.ok(layout.canvas.width >= layout.viewport.width - 1, 'canvas must cover the viewport width');
  assert.ok(layout.canvas.height >= layout.viewport.height - 1, 'canvas must cover the viewport height');
  assert.ok(layout.scorebar.x >= -1 && layout.scorebar.right <= layout.viewport.width + 1, 'scorebar must stay inside the viewport');
  assert.ok(layout.controls.x >= -1 && layout.controls.right <= layout.viewport.width + 1, 'controls must stay inside the viewport');
  assert.ok(layout.controls.bottom <= layout.viewport.height + 1, 'controls must stay above the viewport bottom');
  assert.ok(layout.joystick.x >= -1 && layout.joystick.right <= layout.viewport.width + 1, 'joystick must stay inside the viewport');
  assert.ok(layout.joystick.bottom <= layout.viewport.height + 1, 'joystick must stay above the viewport bottom');
}

async function dragAndHoldMobileJoystick(page, context) {
  await page.locator('.game-screen').waitFor({ state: 'visible' });
  await page.locator('.live-match-canvas canvas').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__goalLeagueDebug?.snapshot().activeUser), null, { timeout: 20_000 });

  const control = page.locator('.game-joystick');
  const box = await control.boundingBox();
  assert.ok(box, 'analogue joystick must have a visible touch target');
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const target = { x: centre.x + box.width * 0.31, y: centre.y - box.height * 0.2 };
  const client = await context.newCDPSession(page);
  const before = await page.evaluate(() => window.__goalLeagueDebug.snapshot().activeUser);
  assert.ok(before, 'an active user player must be available before the joystick drag');

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: centre.x, y: centre.y, radiusX: 8, radiusY: 8, force: 1, id: 17 }],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: target.x, y: target.y, radiusX: 8, radiusY: 8, force: 1, id: 17 }],
    });

    await page.waitForFunction(() => {
      const input = window.__goalLeagueDebug?.input();
      return Boolean(input && Math.hypot(input.moveX ?? 0, input.moveY ?? 0) > 0.45);
    });
    await page.waitForTimeout(1250);

    const during = await page.evaluate(() => ({
      input: window.__goalLeagueDebug.input(),
      snapshot: window.__goalLeagueDebug.snapshot(),
      selectedText: window.getSelection()?.toString() ?? '',
      active: document.querySelector('.game-joystick')?.getAttribute('data-active'),
      magnitude: Number(document.querySelector('.game-joystick')?.getAttribute('data-magnitude') ?? 0),
    }));

    await page.screenshot({
      path: `${screenshotDir}/06-game-joystick-hold-mobile.png`,
      fullPage: false,
      animations: 'disabled',
    });

    assert.ok((during.input.moveX ?? 0) > 0.3, 'rightward joystick drag must produce positive horizontal input');
    assert.ok((during.input.moveY ?? 0) > 0.15, 'upward joystick drag must produce positive vertical input');
    assert.equal(during.active, 'true', 'held joystick must expose active feedback');
    assert.ok(during.magnitude > 0.45, 'held joystick must expose analogue strength');
    assert.equal(during.selectedText, '', 'joystick drag must not select interface text');
    assert.ok(during.snapshot.activeUser, 'an active user player must remain selected');

    const samePlayer = during.snapshot.activeUser.id === before.id;
    const moved = samePlayer
      ? Math.hypot(
        during.snapshot.activeUser.pos.x - before.pos.x,
        during.snapshot.activeUser.pos.y - before.pos.y,
      )
      : 0;
    const speed = Math.hypot(
      during.snapshot.activeUser.velocity.x,
      during.snapshot.activeUser.velocity.y,
    );
    console.log(`Analogue joystick evidence: player=${during.snapshot.activeUser.id} samePlayer=${samePlayer} moved=${moved.toFixed(3)}m speed=${speed.toFixed(3)}m/s magnitude=${during.magnitude.toFixed(3)}`);
    assert.ok(
      moved > 0.2 || speed > 0.5,
      `analogue hold must drive the active player, observed moved=${moved.toFixed(3)}m speed=${speed.toFixed(3)}m/s`,
    );
  } finally {
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  await page.waitForFunction(() => {
    const input = window.__goalLeagueDebug?.input();
    return Boolean(input && Math.hypot(input.moveX ?? 0, input.moveY ?? 0) < 0.01);
  });
  await page.waitForFunction(() => document.querySelector('.game-joystick')?.getAttribute('data-active') === 'false');
}

async function verifyGuidedPassingAndTurnover(page, name) {
  await page.waitForFunction(() => {
    const debug = window.__goalLeagueDebug;
    return Boolean(debug?.preparePassGuide && debug?.forceOpponentTurnover && debug?.entity);
  }, null, { timeout: 15_000 });

  const passSetup = await page.evaluate(() => window.__goalLeagueDebug.preparePassGuide());
  assert.ok(passSetup.carrierId, 'pass-guide scenario must create a user carrier');
  await page.waitForFunction(
    () => Boolean(window.__goalLeagueDebug?.snapshot().passTargetId),
    null,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(250);
  await page.screenshot({
    path: `${screenshotDir}/08-pass-guide-${name}.png`,
    fullPage: false,
    animations: 'disabled',
  });

  const guided = await page.evaluate(() => window.__goalLeagueDebug.snapshot());
  assert.equal(guided.carrierId, passSetup.carrierId, 'prepared user must retain the ball while the guide is captured');
  assert.ok(guided.passTargetId, 'visible pass guide must resolve to an available teammate');

  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.waitForFunction(
    (carrierId) => window.__goalLeagueDebug?.snapshot().lastPass?.fromId === carrierId,
    guided.carrierId,
    { timeout: 5_000 },
  );
  const executedPass = await page.evaluate(() => window.__goalLeagueDebug.snapshot().lastPass);
  assert.equal(executedPass.toId, guided.passTargetId, 'Pass must be sent to the teammate indicated by the live guide');
  console.log(`Pass-guide evidence: carrier=${guided.carrierId} target=${guided.passTargetId} executed=${executedPass.toId}`);

  const turnover = await page.evaluate(() => window.__goalLeagueDebug.forceOpponentTurnover());
  assert.ok(turnover.tacklerId, 'turnover scenario must identify the opponent tackler');
  const start = await page.evaluate((id) => window.__goalLeagueDebug.entity(id), turnover.tacklerId);
  assert.ok(start, 'opponent tackler must remain inspectable after the challenge');
  assert.ok(
    Math.hypot(start.velocity.x, start.velocity.y) < 10,
    `tackle winner must settle below glide speed, observed ${Math.hypot(start.velocity.x, start.velocity.y).toFixed(2)}m/s`,
  );

  let outletPass = null;
  let travelAtPass = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < 35; attempt += 1) {
    await page.waitForTimeout(100);
    const sample = await page.evaluate((id) => ({
      snapshot: window.__goalLeagueDebug.snapshot(),
      entity: window.__goalLeagueDebug.entity(id),
    }), turnover.tacklerId);
    if (sample.snapshot.lastPass?.fromId === turnover.tacklerId) {
      outletPass = sample.snapshot.lastPass;
      travelAtPass = Math.hypot(sample.entity.pos.x - start.pos.x, sample.entity.pos.y - start.pos.y);
      break;
    }
  }

  assert.ok(outletPass, 'opponent tackle winner must make a tactical outlet pass');
  assert.notEqual(outletPass.toId, turnover.tacklerId, 'outlet pass must go to another opponent');
  assert.ok(travelAtPass < 3.5, `opponent travelled ${travelAtPass.toFixed(2)}m before releasing the ball`);
  console.log(`Turnover evidence: tackler=${turnover.tacklerId} outlet=${outletPass.toId} travelBeforePass=${travelAtPass.toFixed(3)}m`);

  await page.waitForTimeout(450);
  await page.screenshot({
    path: `${screenshotDir}/09-tactical-outlet-${name}.png`,
    fullPage: false,
    animations: 'disabled',
  });
}

async function captureJourney(name, viewport, mobile = false) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    reducedMotion: 'reduce',
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      : undefined,
    recordVideo: mobile ? { dir: videoDir, size: viewport } : undefined,
  });
  const page = await context.newPage();
  const video = page.video();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const shot = async (number, routeName) => {
    await page.screenshot({
      path: `${screenshotDir}/${number}-${routeName}-${name}.png`,
      fullPage: false,
      animations: 'disabled',
    });
  };

  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.landing-native').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(900);
  await shot('01', 'dashboard');

  await page.getByRole('button', { name: /start new career/i }).click();
  await page.waitForURL(/\/start-career$/);
  await page.locator('.career-select-screen').waitFor({ state: 'visible' });
  await page.locator('.career-club-card').nth(1).click();
  await page.waitForTimeout(1200);
  await shot('02', 'start-career');

  await page.locator('.career-begin').click();
  await page.waitForURL(/\/hub$/, { timeout: 20_000 });
  await page.locator('.hub').waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);
  await shot('03', 'hub');

  await page.getByRole('button', { name: /play match/i }).click();
  await page.waitForURL(/\/confirm-match\//, { timeout: 20_000 });
  await page.locator('.match-confirm-screen').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
  await shot('04', 'confirm-match');

  await page.locator('.kickoff-button').click();
  await page.waitForURL(/\/game\//, { timeout: 20_000 });
  await page.locator('.game-screen').waitFor({ state: 'visible' });
  await page.locator('.live-match-canvas canvas').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(2500);
  await assertGameplayLayout(page);
  await shot('05', 'game');

  if (mobile) {
    await dragAndHoldMobileJoystick(page, context);
    await verifyGuidedPassingAndTurnover(page, name);
  }

  await page.waitForTimeout(2500);
  await assertGameplayLayout(page);
  await shot('10', 'game-motion');

  if (pageErrors.length > 0) {
    throw new Error(`${name} page errors:\n${pageErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`${name} console errors:\n${consoleErrors.join('\n')}`);
  }

  await context.close();
  if (video) await video.saveAs(`${videoDir}/${name}-gameplay.webm`);
}

try {
  await captureJourney('desktop', { width: 1440, height: 900 });
  await captureJourney('mobile', { width: 390, height: 844 }, true);
  await captureJourney('mobile-landscape', { width: 844, height: 390 }, true);
} finally {
  await browser.close();
}
