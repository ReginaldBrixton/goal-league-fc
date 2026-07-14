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
    };
  });

  assert.ok(layout.canvas, 'live canvas must exist');
  assert.ok(layout.scorebar, 'scorebar must exist');
  assert.ok(layout.controls, 'touch controls must exist');
  assert.ok(layout.canvas.width >= layout.viewport.width - 1, 'canvas must cover the viewport width');
  assert.ok(layout.canvas.height >= layout.viewport.height - 1, 'canvas must cover the viewport height');
  assert.ok(layout.scorebar.x >= -1 && layout.scorebar.right <= layout.viewport.width + 1, 'scorebar must stay inside the viewport');
  assert.ok(layout.controls.x >= -1 && layout.controls.right <= layout.viewport.width + 1, 'controls must stay inside the viewport');
  assert.ok(layout.controls.bottom <= layout.viewport.height + 1, 'controls must stay above the viewport bottom');
}

async function pressAndHoldMobileControl(page, context) {
  await page.locator('.game-screen').waitFor({ state: 'visible' });
  await page.locator('.live-match-canvas canvas').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__goalLeagueDebug?.snapshot().activeUser), null, { timeout: 20_000 });

  const control = page.getByRole('button', { name: 'Move right' });
  const box = await control.boundingBox();
  assert.ok(box, 'Move-right control must have a visible touch target');
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const client = await context.newCDPSession(page);
  const before = await page.evaluate(() => window.__goalLeagueDebug.snapshot().activeUser);
  assert.ok(before, 'an active user player must be available before the hold');

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: point.x, y: point.y, radiusX: 8, radiusY: 8, force: 1, id: 17 }],
    });
    await page.waitForFunction(() => window.__goalLeagueDebug.input().right === true);
    await page.waitForTimeout(1250);

    const during = await page.evaluate(() => ({
      input: window.__goalLeagueDebug.input(),
      snapshot: window.__goalLeagueDebug.snapshot(),
      selectedText: window.getSelection()?.toString() ?? '',
      pressed: document.querySelector('[aria-label="Move right"]')?.getAttribute('data-pressed'),
    }));

    await page.screenshot({
      path: `${screenshotDir}/06-game-control-hold-mobile.png`,
      fullPage: false,
      animations: 'disabled',
    });

    assert.equal(during.input.right, true, 'held pointer must keep movement active');
    assert.equal(during.pressed, 'true', 'held control must show pressed feedback');
    assert.equal(during.selectedText, '', 'long press must not select interface text');
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
    console.log(`Mobile hold evidence: player=${during.snapshot.activeUser.id} samePlayer=${samePlayer} moved=${moved.toFixed(3)}m speed=${speed.toFixed(3)}m/s`);
    assert.ok(
      moved > 0.2 || speed > 0.5,
      `held movement must drive the active player, observed moved=${moved.toFixed(3)}m speed=${speed.toFixed(3)}m/s`,
    );
  } finally {
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  await page.waitForFunction(() => window.__goalLeagueDebug.input().right === false);
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

  if (mobile) await pressAndHoldMobileControl(page, context);

  await page.waitForTimeout(4500);
  await assertGameplayLayout(page);
  await shot('07', 'game-motion');

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
