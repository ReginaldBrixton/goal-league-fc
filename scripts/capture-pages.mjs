import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = 'screenshots';
const videoDir = 'videos';
const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

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
  assert.ok(
    layout.controls.bottom <= layout.viewport.height + 1,
    `controls must stay above the viewport bottom: controls=${JSON.stringify(layout.controls)} viewport=${JSON.stringify(layout.viewport)}`,
  );
  assert.ok(layout.joystick.x >= -1 && layout.joystick.right <= layout.viewport.width + 1, 'joystick must stay inside the viewport');
  assert.ok(layout.joystick.bottom <= layout.viewport.height + 1, 'joystick must stay above the viewport bottom');
}

async function dragAndHoldMobileJoystick(page, context) {
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
    await page.waitForTimeout(900);

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

    assert.ok((during.input.moveX ?? 0) > 0.3);
    assert.ok((during.input.moveY ?? 0) > 0.15);
    assert.equal(during.active, 'true');
    assert.ok(during.magnitude > 0.45);
    assert.equal(during.selectedText, '');
    assert.ok(during.snapshot.activeUser);
    const moved = during.snapshot.activeUser.id === before.id
      ? Math.hypot(during.snapshot.activeUser.pos.x - before.pos.x, during.snapshot.activeUser.pos.y - before.pos.y)
      : 0;
    const speed = Math.hypot(during.snapshot.activeUser.velocity.x, during.snapshot.activeUser.velocity.y);
    console.log(`Analogue joystick evidence: moved=${moved.toFixed(3)}m speed=${speed.toFixed(3)}m/s magnitude=${during.magnitude.toFixed(3)}`);
    assert.ok(moved > 0.2 || speed > 0.5);
  } finally {
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  await page.waitForFunction(() => {
    const input = window.__goalLeagueDebug?.input();
    return Boolean(input && Math.hypot(input.moveX ?? 0, input.moveY ?? 0) < 0.01);
  });
}

async function pressMobileAction(page, context, selector) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, `${selector} must have a visible touch target`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const client = await context.newCDPSession(page);
  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: point.x, y: point.y, radiusX: 8, radiusY: 8, force: 1, id: 31 }],
    });
    await page.waitForTimeout(180);
  } finally {
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
}

async function verifyGuidedPassingAndTurnover(page, context, name) {
  const passSetup = await page.evaluate(() => window.__goalLeagueDebug.preparePassGuide());
  assert.ok(passSetup.carrierId);
  await page.waitForFunction(() => Boolean(window.__goalLeagueDebug?.snapshot().passTargetId), null, { timeout: 8_000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${screenshotDir}/08-pass-guide-${name}.png`, fullPage: false, animations: 'disabled' });

  const guided = await page.evaluate(() => window.__goalLeagueDebug.snapshot());
  assert.equal(guided.carrierId, passSetup.carrierId);
  assert.ok(guided.passTargetId);
  await pressMobileAction(page, context, '.game-action.pass');
  await page.waitForFunction(
    (carrierId) => window.__goalLeagueDebug?.snapshot().lastPass?.fromId === carrierId,
    guided.carrierId,
    { timeout: 5_000 },
  );
  const executedPass = await page.evaluate(() => window.__goalLeagueDebug.snapshot().lastPass);
  assert.equal(executedPass.toId, guided.passTargetId);
  console.log(`Pass-guide evidence: viewport=${name} target=${guided.passTargetId} executed=${executedPass.toId}`);

  const turnover = await page.evaluate(() => window.__goalLeagueDebug.forceOpponentTurnover());
  const start = await page.evaluate((id) => window.__goalLeagueDebug.entity(id), turnover.tacklerId);
  assert.ok(start);
  assert.ok(Math.hypot(start.velocity.x, start.velocity.y) < 10);

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
  assert.ok(outletPass);
  assert.notEqual(outletPass.toId, turnover.tacklerId);
  assert.ok(travelAtPass < 3.5);
  console.log(`Turnover evidence: viewport=${name} outlet=${outletPass.toId} travelBeforePass=${travelAtPass.toFixed(3)}m`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${screenshotDir}/09-tactical-outlet-${name}.png`, fullPage: false, animations: 'disabled' });
}

async function waitForLiveMatch(page) {
  await page.locator('.game-screen').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('.live-match-canvas canvas').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__goalLeagueDebug?.snapshot().activeUser), null, { timeout: 20_000 });
  await page.waitForTimeout(900);
}

async function enterMatch(page) {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.landing-native').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: /start new career/i }).click();
  await page.waitForURL(/\/start-career$/);
  await page.locator('.career-club-card').nth(1).click();
  await page.locator('.career-begin').click();
  await page.waitForURL(/\/hub$/, { timeout: 20_000 });
  await page.getByRole('button', { name: /play match/i }).click();
  await page.waitForURL(/\/confirm-match\//, { timeout: 20_000 });
  await page.locator('.kickoff-button').click();
  await page.waitForURL(/\/game\//, { timeout: 20_000 });
  await waitForLiveMatch(page);
}

function trackBrowserErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

async function captureDesktop() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = trackBrowserErrors(page);
  await enterMatch(page);
  await assertGameplayLayout(page);
  await page.screenshot({ path: `${screenshotDir}/05-game-desktop.png`, fullPage: false, animations: 'disabled' });
  assert.deepEqual(errors.pageErrors, []);
  assert.deepEqual(errors.consoleErrors, []);
  await context.close();
}

async function captureMobilePortrait() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
    userAgent: mobileUserAgent,
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = trackBrowserErrors(page);

  await enterMatch(page);
  await assertGameplayLayout(page);
  await page.screenshot({ path: `${screenshotDir}/05-game-mobile.png`, fullPage: false, animations: 'disabled' });
  await dragAndHoldMobileJoystick(page, context);
  await verifyGuidedPassingAndTurnover(page, context, 'mobile');

  const session = await page.evaluate(() => ({
    url: window.location.href,
    localStorage: Object.entries(window.localStorage),
    sessionStorage: Object.entries(window.sessionStorage),
  }));

  assert.deepEqual(errors.pageErrors, []);
  assert.deepEqual(errors.consoleErrors, []);
  await context.close();
  if (video) await video.saveAs(`${videoDir}/mobile-portrait-gameplay.webm`);
  return session;
}

async function captureMobileLandscape(session) {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
    userAgent: mobileUserAgent,
    recordVideo: { dir: videoDir, size: { width: 844, height: 390 } },
  });
  await context.addInitScript((stored) => {
    for (const [key, value] of stored.localStorage) window.localStorage.setItem(key, value);
    for (const [key, value] of stored.sessionStorage) window.sessionStorage.setItem(key, value);
  }, session);

  const page = await context.newPage();
  const video = page.video();
  const errors = trackBrowserErrors(page);
  await page.goto(session.url, { waitUntil: 'domcontentloaded' });
  await waitForLiveMatch(page);
  await assertGameplayLayout(page);
  await page.screenshot({ path: `${screenshotDir}/05-game-mobile-landscape.png`, fullPage: false, animations: 'disabled' });
  await verifyGuidedPassingAndTurnover(page, context, 'mobile-landscape');
  await page.screenshot({ path: `${screenshotDir}/10-game-motion-mobile-landscape.png`, fullPage: false, animations: 'disabled' });

  assert.deepEqual(errors.pageErrors, []);
  assert.deepEqual(errors.consoleErrors, []);
  await context.close();
  if (video) await video.saveAs(`${videoDir}/mobile-landscape-gameplay.webm`);
}

try {
  await captureDesktop();
  const session = await captureMobilePortrait();
  await captureMobileLandscape(session);
} finally {
  await browser.close();
}
